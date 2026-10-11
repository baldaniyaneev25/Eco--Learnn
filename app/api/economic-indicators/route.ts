import { enforceRateLimit, handle, publicJson } from "@/lib/api";
import { listLatestIndicators } from "@/lib/content/public";
import { connectDB } from "@/lib/db";

// Latest verified value per indicator. Each value carries its own reference
// period, unit, source and revision status; values are never combined.
export const GET = handle(async (req) => {
  enforceRateLimit(req, "public", 120);
  await connectDB();
  const indicators = await listLatestIndicators();
  return publicJson({ items: indicators, total: indicators.length }, 900);
});
