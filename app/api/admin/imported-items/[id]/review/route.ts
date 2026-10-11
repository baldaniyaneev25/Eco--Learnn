import { handle, objectId, privateJson, readJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { applyReview, ReviewActionSchema } from "@/lib/content/review";

// Body: { action: "approve" | "edit" | "reject" | "archive" | "rollback", ... }
export const PATCH = handle(async (req, ctx: RouteContext<"/api/admin/imported-items/[id]/review">) => {
  const user = await requireRole(req, STAFF);
  const id = objectId.parse((await ctx.params).id);
  const input = await readJson(req, ReviewActionSchema);
  const item = await applyReview(id, input, user);
  return privateJson({ item: item.toObject() });
});
