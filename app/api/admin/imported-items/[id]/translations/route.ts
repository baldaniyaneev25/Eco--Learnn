import { handle, objectId, privateJson, readJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { saveTranslation, TranslationInputSchema } from "@/lib/content/review";

export const PUT = handle(async (req, ctx: RouteContext<"/api/admin/imported-items/[id]/translations">) => {
  const user = await requireRole(req, STAFF);
  const id = objectId.parse((await ctx.params).id);
  const input = await readJson(req, TranslationInputSchema);
  const translation = await saveTranslation(id, input, user);
  return privateJson({ translation: translation?.toObject() });
});
