import { ApiError, enforceRateLimit, handle, publicJson } from "@/lib/api";
import { getIndicatorSeries } from "@/lib/content/public";
import { connectDB } from "@/lib/db";

export const GET = handle(async (req, ctx: RouteContext<"/api/economic-indicators/[code]">) => {
  enforceRateLimit(req, "public", 120);
  const { code } = await ctx.params;
  if (!/^[A-Za-z0-9._-]{1,60}$/.test(code)) throw new ApiError(400, "Invalid indicator code");
  await connectDB();
  const series = await getIndicatorSeries(code);
  if (!series) throw new ApiError(404, "Indicator not found");
  return publicJson(series, 900);
});
