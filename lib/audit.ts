import { ContentAuditLog } from "./models/ContentAuditLog";

export interface Actor {
  id?: string;
  email: string;
}

export const SYSTEM_ACTOR: Actor = { email: "system" };

export async function audit(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string | undefined,
  summary: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await ContentAuditLog.create({
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entityType,
      entityId,
      summary,
      details,
    });
  } catch (err) {
    // An audit write failure must be visible but should not lose the action.
    console.error("[audit] failed to record", action, err);
  }
}
