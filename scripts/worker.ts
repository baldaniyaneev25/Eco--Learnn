// Long-running background worker for scheduled synchronisation.
// Run with `npm run worker` on a VM/container next to the web app.
// Several workers may run safely: jobs are claimed atomically and each source
// has a MongoDB lock, so the same source is never synced concurrently.

import { connectDB, disconnectDB } from "@/lib/db";
import { runDueSyncs } from "@/lib/ingestion/sync";

const TICK_MS = Number(process.env.WORKER_TICK_SECONDS ?? 60) * 1000;
let stopping = false;
let wake: (() => void) | null = null;

async function main() {
  await connectDB();
  console.log(`[worker] started; tick every ${TICK_MS / 1000}s`);
  while (!stopping) {
    try {
      const summary = await runDueSyncs({ budgetMs: Math.max(TICK_MS * 5, 5 * 60_000) });
      if (summary.ran || summary.recovered || summary.errors.length) {
        console.log(`[worker] ${new Date().toISOString()}`, JSON.stringify(summary));
      }
    } catch (err) {
      console.error("[worker] tick failed", err);
    }
    await new Promise<void>((resolve) => {
      wake = resolve;
      setTimeout(resolve, TICK_MS);
    });
  }
  await disconnectDB();
  console.log("[worker] stopped");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[worker] ${signal} received, finishing current tick…`);
    stopping = true;
    wake?.();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
