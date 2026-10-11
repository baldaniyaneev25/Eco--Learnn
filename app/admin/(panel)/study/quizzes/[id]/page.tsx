import { Suspense } from "react";
import { QuizEditor } from "@/components/admin/study/QuizEditor";

export const metadata = { title: "Edit quiz" };

export default function QuizPage({ params }: PageProps<"/admin/study/quizzes/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <QuizEditor params={params} />
    </Suspense>
  );
}
