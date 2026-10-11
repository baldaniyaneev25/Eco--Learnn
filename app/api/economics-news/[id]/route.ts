import { ApiError, enforceRateLimit, handle, publicJson } from "@/lib/api";
import { getPublished } from "@/lib/content/public";
import { connectDB } from "@/lib/db";

export const GET = handle(async (req, ctx: RouteContext<"/api/economics-news/[id]">) => {
  enforceRateLimit(req, "public", 120);
  const { id } = await ctx.params;
  await connectDB();
  const lang = req.nextUrl.searchParams.get("lang");
  const item = await getPublished(id, ["news", "current-affairs"], lang === "en" || lang === "gu" ? lang : undefined);
  if (!item) throw new ApiError(404, "Not found");
  return publicJson({ item });
});
