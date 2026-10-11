import { Suspense } from "react";
import { SyncJobs } from "@/components/admin/SyncJobs";

export const metadata = { title: "Sync jobs" };

export default function JobsPage() {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <SyncJobs />
    </Suspense>
  );
}
