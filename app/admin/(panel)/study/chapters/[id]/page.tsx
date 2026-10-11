import { Suspense } from "react";
import { ChapterEditor } from "@/components/admin/study/ChapterEditor";

export const metadata = { title: "Edit chapter" };

export default function ChapterPage({ params }: PageProps<"/admin/study/chapters/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <ChapterEditor params={params} />
    </Suspense>
  );
}
