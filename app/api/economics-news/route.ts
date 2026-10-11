import { handle, paged, publicJson } from "@/lib/api";
import { listPublished } from "@/lib/content/public";
import { preparePublicQuery } from "@/lib/content/public-query";

export const GET = handle(async (req) => {
  const q = await preparePublicQuery(req);
  const { items, total } = await listPublished("news", q);
  return publicJson(paged(items, total, q.page, q.limit));
});
