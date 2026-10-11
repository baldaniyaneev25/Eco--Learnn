import net from "node:net";
import { findApprovedDomain, type ApprovedDomain } from "@/config/approved-sources";
import { env } from "@/lib/env";

export class UrlNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlNotAllowedError";
  }
}

export interface ValidatedUrl {
  url: URL;
  approved: ApprovedDomain;
}

/**
 * Validates a URL before any fetch or before saving it on a data source:
 * https only, default port, no embedded credentials, no IP literals or
 * localhost names, and the host must be on the approved-domain allowlist.
 */
export function validateSourceUrl(raw: string, extraDomains: string[] = env.extraAllowedDomains): ValidatedUrl {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UrlNotAllowedError("Invalid URL");
  }
  if (url.protocol !== "https:") throw new UrlNotAllowedError("Only https URLs are allowed");
  if (url.username || url.password) throw new UrlNotAllowedError("URLs with credentials are not allowed");
  if (url.port && url.port !== "443") throw new UrlNotAllowedError("Non-standard ports are not allowed");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (net.isIP(host)) throw new UrlNotAllowedError("IP address hosts are not allowed");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UrlNotAllowedError("Internal host names are not allowed");
  }
  if (!host.includes(".")) throw new UrlNotAllowedError("Host must be a fully qualified domain");

  const approved = findApprovedDomain(host, extraDomains);
  if (!approved) throw new UrlNotAllowedError(`Domain ${host} is not on the approved source allowlist`);
  url.hash = "";
  return { url, approved };
}
