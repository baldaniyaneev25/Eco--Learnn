import { Suspense } from "react";
import { NewsDetail } from "@/components/student/NewsDetail";

export default function NewsDetailPage({ params }: PageProps<"/news/[id]">) {
  return (
    <Suspense fallback={<p className="py-8 text-center text-stone-500">…</p>}>
      <NewsDetail params={params} />
    </Suspense>
  );
}
