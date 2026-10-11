import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { User, type Role } from "@/lib/models/User";
import type { Actor } from "@/lib/audit";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export interface AuthedUser extends Actor {
  id: string;
  email: string;
  name: string;
  role: Role;
  board: string;
  classLevel: string;
  preferredLanguage: "en" | "gu";
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Rejects cross-site state-changing requests (defence in depth beside SameSite cookies). */
function checkOrigin(req: NextRequest) {
  if (!MUTATING.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients; the session cookie is still required
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new ApiError(403, "Cross-origin request rejected");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(403, "Invalid origin");
  }
}

export async function getSessionUser(req: NextRequest): Promise<AuthedUser | null> {
  // Browsers use the session cookie; the mobile app sends the same signed token as a Bearer header.
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value ?? bearer);
  if (!session) return null;
  await connectDB();
  // Role is re-read from the database so revoked access takes effect at once.
  const user = await User.findById(session.uid).lean();
  if (!user || !user.isActive) return null;
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role as Role,
    board: user.board ?? "GSEB",
    classLevel: user.classLevel ?? "12",
    preferredLanguage: (user.preferredLanguage as "en" | "gu") ?? "gu",
  };
}

/**
 * Server-side authorization for every admin request. "editor" may review and
 * translate content; "admin" may additionally manage sources and syncs.
 */
export async function requireRole(req: NextRequest, roles: Role[]): Promise<AuthedUser> {
  checkOrigin(req);
  const user = await getSessionUser(req);
  if (!user) throw new ApiError(401, "Authentication required");
  if (!roles.includes(user.role)) throw new ApiError(403, "Insufficient permissions");
  return user;
}

export const STAFF: Role[] = ["admin", "editor"];
export const ADMIN_ONLY: Role[] = ["admin"];
