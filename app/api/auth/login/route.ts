import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, enforceRateLimit, handle, readJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, MOBILE_TOKEN_TTL_SECONDS, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { User, type Role } from "@/lib/models/User";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
  client: z.enum(["web", "mobile"]).default("web"),
});

export const POST = handle(async (req) => {
  enforceRateLimit(req, "login", 10, 15 * 60_000);
  const { email, password, client } = await readJson(req, LoginSchema);
  await connectDB();
  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = user && user.isActive && (await verifyPassword(password, user.passwordHash));
  if (!ok || !user) throw new ApiError(401, "Invalid email or password");

  if (user.role !== "student") {
    await audit({ id: String(user._id), email: user.email }, "auth.login", "user", String(user._id), "Staff login");
  }
  const publicUser = { id: String(user._id), name: user.name, email: user.email, role: user.role as Role };
  // The mobile app stores a Bearer token in the device's secure storage instead of a cookie.
  if (client === "mobile") {
    const token = createSessionToken(String(user._id), user.role as Role, undefined, undefined, MOBILE_TOKEN_TTL_SECONDS);
    return NextResponse.json({ user: publicUser, token }, { headers: { "Cache-Control": "no-store" } });
  }
  const res = NextResponse.json({ user: publicUser });
  res.cookies.set(SESSION_COOKIE, createSessionToken(String(user._id), user.role as Role), sessionCookieOptions());
  return res;
});
