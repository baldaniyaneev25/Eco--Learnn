import { Suspense } from "react";
import { ItemReview } from "@/components/admin/ItemReview";

export const metadata = { title: "Review item" };

export default function ItemPage({ params }: PageProps<"/admin/web-data/items/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <ItemReview params={params} />
    </Suspense>
  );
}
