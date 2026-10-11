import crypto from "node:crypto";
import { env } from "@/lib/env";
import type { Role } from "@/lib/models/User";

export const SESSION_COOKIE = "ecolearn_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export interface SessionPayload {
  uid: string;
  role: Role;
  exp: number;
}

function sign(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

/** Mobile app tokens live longer; they are still re-checked against the user record on every request. */
export const MOBILE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export function createSessionToken(
  uid: string,
  role: Role,
  secret = env.sessionSecret,
  now = Date.now(),
  ttlSeconds = SESSION_TTL_SECONDS,
): string {
  const payload: SessionPayload = { uid, role, exp: Math.floor(now / 1000) + ttlSeconds };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret = env.sessionSecret,
  now = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.uid !== "string" || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
