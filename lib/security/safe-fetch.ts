import dns from "node:dns";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import type { LookupFunction } from "node:net";
import zlib from "node:zlib";
import type { Readable } from "node:stream";
import { isBlockedIp } from "./ip";
import { validateSourceUrl } from "./url-guard";

export class FetchError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  accept?: string;
  /** Lower-case content-type prefixes accepted, e.g. ["application/json"]. */
  allowedContentTypes?: string[];
  extraDomains?: string[];
}

export interface SafeFetchResult {
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
}

const USER_AGENT = "EcoLearnBot/1.0 (+education platform; contact via site admin)";

/**
 * DNS lookup that refuses private/internal addresses. Because it runs inside
 * the socket connect, the address that is checked is the address used, which
 * defeats DNS-rebinding between a pre-check and the real connection.
 */
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0) return callback(new FetchError(`No address for ${hostname}`, true), "", 4);
    const blocked = list.find((a) => isBlockedIp(a.address));
    if (blocked) {
      return callback(new FetchError(`Blocked address ${blocked.address} for ${hostname}`, false), "", 4);
    }
    if (options.all) {
      (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    } else {
      callback(null, list[0].address, list[0].family);
    }
  });
};

function decode(res: IncomingMessage): Readable {
  const encoding = (res.headers["content-encoding"] ?? "").toLowerCase();
  if (encoding === "gzip" || encoding === "x-gzip") return res.pipe(zlib.createGunzip());
  if (encoding === "deflate") return res.pipe(zlib.createInflate());
  if (encoding === "br") return res.pipe(zlib.createBrotliDecompress());
  return res;
}

function parseRetryAfter(value: string | string[] | undefined): number | undefined {
  if (!value || Array.isArray(value)) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function requestOnce(url: URL, opts: Required<Omit<SafeFetchOptions, "extraDomains">>): Promise<
  { kind: "redirect"; location: string } | SafeFetchResult
> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        headers: {
          "user-agent": USER_AGENT,
          accept: opts.accept,
          "accept-encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ kind: "redirect", location: res.headers.location });
        }
        if (status === 429 || status >= 500) {
          res.resume();
          return reject(new FetchError(`HTTP ${status}`, true, status, parseRetryAfter(res.headers["retry-after"])));
        }
        if (status < 200 || status >= 300) {
          res.resume();
          // 401/403 usually means access control: never try to work around it.
          return reject(new FetchError(`HTTP ${status}`, status === 408, status));
        }
        const contentType = (res.headers["content-type"] ?? "").toLowerCase();
        if (opts.allowedContentTypes.length && !opts.allowedContentTypes.some((t) => contentType.startsWith(t))) {
          res.resume();
          return reject(new FetchError(`Unexpected content-type "${contentType}"`, false, status));
        }
        const declared = Number(res.headers["content-length"]);
        if (Number.isFinite(declared) && declared > opts.maxBytes) {
          res.destroy();
          return reject(new FetchError(`Response too large (${declared} bytes)`, false, status));
        }
        const stream = decode(res);
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > opts.maxBytes) {
            stream.destroy();
            res.destroy();
            reject(new FetchError(`Response exceeded ${opts.maxBytes} bytes`, false, status));
            return;
          }
          chunks.push(chunk);
        });
        stream.on("error", (err) => reject(new FetchError(`Read failed: ${err.message}`, true, status)));
        stream.on("end", () =>
          resolve({ status, finalUrl: url.toString(), contentType, body: Buffer.concat(chunks).toString("utf8") }),
        );
      },
    );
    req.setTimeout(opts.timeoutMs, () => req.destroy(new FetchError(`Timed out after ${opts.timeoutMs}ms`, true)));
    req.on("error", (err) =>
      reject(err instanceof FetchError ? err : new FetchError(`Network error: ${err.message}`, true)),
    );
    req.end();
  });
}

/**
 * Fetches an approved URL with SSRF protections, redirect re-validation,
 * timeouts and response-size limits. Content is returned as text only and is
 * never executed or interpreted as instructions.
 */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const opts = {
    timeoutMs: options.timeoutMs ?? 15_000,
    maxBytes: options.maxBytes ?? 2 * 1024 * 1024,
    maxRedirects: options.maxRedirects ?? 3,
    accept: options.accept ?? "*/*",
    allowedContentTypes: options.allowedContentTypes ?? [],
  };
  let current = validateSourceUrl(rawUrl, options.extraDomains).url;
  const deadline = Date.now() + opts.timeoutMs;

  for (let hop = 0; hop <= opts.maxRedirects; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new FetchError("Timed out following redirects", true);
    const result = await requestOnce(current, { ...opts, timeoutMs: remaining });
    if ("kind" in result) {
      // Every redirect target must pass the same allowlist checks.
      current = validateSourceUrl(new URL(result.location, current).toString(), options.extraDomains).url;
      continue;
    }
    return result;
  }
  throw new FetchError(`Too many redirects (>${opts.maxRedirects})`, false);
}
