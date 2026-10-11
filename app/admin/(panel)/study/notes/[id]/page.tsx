import { Suspense } from "react";
import { NoteEditor } from "@/components/admin/study/NoteEditor";

export const metadata = { title: "Edit note" };

export default function NotePage({ params }: PageProps<"/admin/study/notes/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <NoteEditor params={params} />
    </Suspense>
  );
}
