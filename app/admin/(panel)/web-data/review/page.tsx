import { Suspense } from "react";
import { ReviewQueue } from "@/components/admin/ReviewQueue";

export const metadata = { title: "Review queue" };

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <ReviewQueue />
    </Suspense>
  );
}
