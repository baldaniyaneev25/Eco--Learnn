import { audit, SYSTEM_ACTOR } from "@/lib/audit";
import { env } from "@/lib/env";

/**
 * Alerts administrators about a repeatedly failing integration: always via the
 * audit log + the alert banner in Web Data Manager (alertActive on the
 * source), and optionally via a webhook (Slack/Teams/email bridge) set in
 * ALERT_WEBHOOK_URL.
 */
export async function alertAdmins(sourceId: string, sourceName: string, failures: number, lastError: string) {
  const message = `Data source "${sourceName}" has failed ${failures} consecutive syncs. Last error: ${lastError}`;
  await audit(SYSTEM_ACTOR, "source.alert", "dataSource", sourceId, message, { failures, lastError });
  const webhook = env.alertWebhookUrl;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `[EcoLearn] ${message}` }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[alerts] webhook failed", err);
  }
}
