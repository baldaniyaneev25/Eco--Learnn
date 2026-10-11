import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ReviewError } from "@/lib/content/review";
import { SyncNotAllowedError } from "@/lib/ingestion/sync";
import { UrlNotAllowedError } from "@/lib/security/url-guard";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Wraps a route handler with uniform JSON error responses. */
export function handle<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      // Let Next.js internal control-flow errors (prerender bail-out, redirect…) through.
      unstable_rethrow(err);
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
      }
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation failed", details: z.flattenError(err) }, { status: 400 });
      }
      if (err instanceof UrlNotAllowedError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err instanceof ReviewError || err instanceof SyncNotAllowedError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("[api]", req.method, req.nextUrl.pathname, err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export async function readJson<T>(req: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(415, "Expected application/json");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Malformed JSON body");
  }
  return schema.parse(body);
}

export function pagination(req: NextRequest, maxLimit = 50) {
  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(params.get("limit")) || 20)));
  return { page, limit, skip: (page - 1) * limit };
}

export function paged<T>(items: T[], total: number, page: number, limit: number) {
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

/** Public JSON with CDN-friendly caching. */
export function publicJson(data: unknown, maxAgeSeconds = 300) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, max-age=60, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`,
    },
  });
}

export function privateJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export function enforceRateLimit(req: NextRequest, bucket: string, limit: number, windowMs = 60_000) {
  const result = rateLimit(`${bucket}:${clientIp(req.headers)}`, limit, windowMs);
  if (!result.ok) {
    throw new ApiError(429, `Too many requests. Retry in ${result.retryAfterSeconds}s`);
  }
}

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
