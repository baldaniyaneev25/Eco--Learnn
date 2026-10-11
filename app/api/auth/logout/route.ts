import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const POST = handle(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
