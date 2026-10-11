import { z } from "zod";
import { BOARDS, CLASS_LEVELS } from "@/config/categories";
import { ApiError, handle, privateJson, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/guard";
import { User } from "@/lib/models/User";

export const GET = handle(async (req) => {
  const user = await getSessionUser(req);
  return privateJson({ user });
});

const PreferencesSchema = z
  .object({
    board: z.enum(BOARDS).optional(),
    classLevel: z.enum(CLASS_LEVELS).optional(),
    preferredLanguage: z.enum(["en", "gu"]).optional(),
  })
  .strict();

export const PATCH = handle(async (req) => {
  const user = await getSessionUser(req);
  if (!user) throw new ApiError(401, "Authentication required");
  const prefs = await readJson(req, PreferencesSchema);
  await User.updateOne({ _id: user.id }, { $set: prefs });
  return privateJson({ user: { ...user, ...prefs } });
});
