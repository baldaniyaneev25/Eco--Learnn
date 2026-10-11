import { handle, paged, publicJson } from "@/lib/api";
import { listPublished } from "@/lib/content/public";
import { preparePublicQuery } from "@/lib/content/public-query";

// Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD&category=&class=&board=&lang=
export const GET = handle(async (req) => {
  const q = await preparePublicQuery(req);
  const { items, total } = await listPublished("current-affairs", q);
  return publicJson(paged(items, total, q.page, q.limit));
});
