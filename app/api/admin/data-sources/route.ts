import { CreateSourceSchema, listSourcesWithStats, validateSourceConfig } from "@/lib/admin/sources";
import { handle, privateJson, readJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ADMIN_ONLY, requireRole, STAFF } from "@/lib/auth/guard";
import { DataSource } from "@/lib/models/DataSource";

export const GET = handle(async (req) => {
  await requireRole(req, STAFF);
  return privateJson({ items: await listSourcesWithStats() });
});

export const POST = handle(async (req) => {
  const user = await requireRole(req, ADMIN_ONLY);
  const input = await readJson(req, CreateSourceSchema);
  const fields = validateSourceConfig(input, user.email);
  const source = await DataSource.create({ ...fields, nextRunAt: new Date() });
  await audit(user, "source.create", "dataSource", String(source._id), `Created source "${source.name}"`, {
    sourceType: source.sourceType,
    baseUrl: source.baseUrl,
    isEnabled: source.isEnabled,
  });
  return privateJson({ item: source.toObject() }, { status: 201 });
});
