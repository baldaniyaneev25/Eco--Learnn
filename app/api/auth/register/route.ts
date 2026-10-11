import { NextResponse } from "next/server";
import { z } from "zod";
import { BOARDS, CLASS_LEVELS } from "@/config/categories";
import { ApiError, enforceRateLimit, handle, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, MOBILE_TOKEN_TTL_SECONDS, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  client: z.enum(["web", "mobile"]).default("web"),
  board: z.enum(BOARDS).default("GSEB"),
  classLevel: z.enum(CLASS_LEVELS).default("12"),
  preferredLanguage: z.enum(["en", "gu"]).default("gu"),
});

// Self-registration only ever creates student accounts.
export const POST = handle(async (req) => {
  enforceRateLimit(req, "register", 5, 60 * 60_000);
  const { client, ...input } = await readJson(req, RegisterSchema);
  await connectDB();
  if (await User.exists({ email: input.email })) throw new ApiError(409, "An account with this email already exists");
  const user = await User.create({ ...input, passwordHash: await hashPassword(input.password), role: "student" });
  const publicUser = { id: String(user._id), name: user.name, email: user.email, role: "student" };
  if (client === "mobile") {
    const token = createSessionToken(String(user._id), "student", undefined, undefined, MOBILE_TOKEN_TTL_SECONDS);
    return NextResponse.json({ user: publicUser, token }, { status: 201, headers: { "Cache-Control": "no-store" } });
  }
  const res = NextResponse.json({ user: publicUser }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, createSessionToken(String(user._id), "student"), sessionCookieOptions());
  return res;
});
