import { BOARDS, CATEGORIES, CLASS_LEVELS, DIFFICULTIES, SECTIONS } from "@/config/categories";

// Static taxonomy for API clients (e.g. the mobile app), so labels live in one place.
export async function GET() {
  return Response.json(
    {
      categories: CATEGORIES.map(({ code, label }) => ({ code, label })),
      sections: SECTIONS,
      boards: BOARDS,
      classLevels: CLASS_LEVELS,
      difficulties: DIFFICULTIES,
    },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
