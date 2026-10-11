import type { NextRequest } from "next/server";
import { CATEGORY_CODES, DIFFICULTIES } from "@/config/categories";
import { enforceRateLimit, pagination } from "@/lib/api";
import { connectDB } from "@/lib/db";
import type { PublicItemQuery } from "./public";

function parseDate(value: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Shared parsing + rate limiting for public listing endpoints. Unknown values are ignored. */
export async function preparePublicQuery(req: NextRequest): Promise<PublicItemQuery> {
  enforceRateLimit(req, "public", 120);
  await connectDB();
  const p = req.nextUrl.searchParams;
  const lang = p.get("lang");
  const category = p.get("category");
  const classLevel = p.get("class");
  const board = p.get("board");
  const to = parseDate(p.get("to"));
  const difficulty = p.get("difficulty");
  return {
    ...pagination(req, 50),
    lang: lang === "en" || lang === "gu" ? lang : undefined,
    category: category && (CATEGORY_CODES as readonly string[]).includes(category) ? category : undefined,
    classLevel: classLevel && /^\d{1,2}$/.test(classLevel) ? classLevel : undefined,
    board: board && /^[A-Z]{2,10}$/.test(board) ? board : undefined,
    difficulty: difficulty && (DIFFICULTIES as readonly string[]).includes(difficulty) ? difficulty : undefined,
    from: parseDate(p.get("from")),
    to: to ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined,
  };
}
