"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { api } from "@/lib/client/api";
import { Button, Card, ErrorBox, Field, inputClass, Notice, useAsync } from "../ui";
import { BilingualField, BoardChecks, biLabel, ClassSelect, describeError, emptyBi, PublishToggle, type Bi } from "./shared";

interface Question {
  _id?: string;
  text: Bi;
  options: Bi[];
  correctIndex: number;
  explanation: Bi;
}

interface QuizData {
  _id?: string;
  kind: "practice" | "test";
  chapterId: string | null;
  classLevel: string;
  boards: string[];
  order: number;
  title: Bi;
  description: Bi;
  durationMinutes: number | null;
  questions: Question[];
  isPublished: boolean;
}

const newQuestion = (): Question => ({ text: emptyBi(), options: [emptyBi(), emptyBi(), emptyBi(), emptyBi()], correctIndex: 0, explanation: emptyBi() });

function QuestionEditor({
  index,
  q,
  onChange,
  onRemove,
  onMove,
  count,
}: {
  index: number;
  q: Question;
  onChange: (q: Question) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  count: number;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="mr-auto">Question {index + 1}</strong>
        <Button variant="ghost" disabled={index === 0} onClick={() => onMove(-1)}>
          ↑ Up
        </Button>
        <Button variant="ghost" disabled={index === count - 1} onClick={() => onMove(1)}>
          ↓ Down
        </Button>
        <Button variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <BilingualField label="Question" value={q.text} onChange={(text) => onChange({ ...q, text })} multiline rows={2} />
      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 font-medium text-stone-700">Options — tick the correct answer</legend>
        {q.options.map((opt, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <label className="flex w-28 items-center gap-1">
              <input type="radio" name={`correct-${index}`} checked={q.correctIndex === i} onChange={() => onChange({ ...q, correctIndex: i })} />
              {String.fromCharCode(65 + i)} {q.correctIndex === i && <span className="text-xs font-semibold text-emerald-700">correct</span>}
            </label>
            <input lang="en" placeholder="English" className={`${inputClass} min-w-40 flex-1`} value={opt.en} onChange={(e) => onChange({ ...q, options: q.options.map((o, j) => (j === i ? { ...o, en: e.target.value } : o)) })} />
            <input lang="gu" placeholder="ગુજરાતી" className={`${inputClass} min-w-40 flex-1`} value={opt.gu} onChange={(e) => onChange({ ...q, options: q.options.map((o, j) => (j === i ? { ...o, gu: e.target.value } : o)) })} />
            {q.options.length > 2 && (
              <Button
                variant="ghost"
                onClick={() =>
                  onChange({
                    ...q,
                    options: q.options.filter((_, j) => j !== i),
                    correctIndex: q.correctIndex === i ? 0 : q.correctIndex > i ? q.correctIndex - 1 : q.correctIndex,
                  })
                }
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        {q.options.length < 6 && (
          <Button variant="secondary" onClick={() => onChange({ ...q, options: [...q.options, emptyBi()] })}>
            + Option
          </Button>
        )}
      </fieldset>
      <BilingualField label="Explanation (shown after submitting)" value={q.explanation} onChange={(explanation) => onChange({ ...q, explanation })} multiline rows={2} />
    </div>
  );
}

function QuizForm({ initial, chapters }: { initial: QuizData; chapters: { _id: string; title: Bi; classLevel: string }[] }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof QuizData>(k: K, v: QuizData[K]) => setQuiz((q) => ({ ...q, [k]: v }));
  const setQuestion = (i: number, q: Question) => set("questions", quiz.questions.map((x, j) => (j === i ? q : x)));
  const linkedChapter = chapters.find((c) => c._id === quiz.chapterId);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { _id, ...body } = quiz;
      const payload = {
        ...body,
        classLevel: linkedChapter?.classLevel ?? body.classLevel,
        durationMinutes: body.kind === "test" ? body.durationMinutes : null,
        questions: body.questions.map(({ _id: qid, ...q }) => (qid ? { _id: qid, ...q } : q)),
      };
      const { item } = await api<{ item: QuizData }>(_id ? `/api/admin/study/quizzes/${_id}` : "/api/admin/study/quizzes", {
        method: _id ? "PUT" : "POST",
        json: payload,
      });
      if (!_id) router.replace(`/admin/study/quizzes/${item._id}`);
      setQuiz({ ...item, chapterId: item.chapterId ?? null, durationMinutes: item.durationMinutes ?? null });
      setMessage("Saved.");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!quiz._id || !window.confirm("Delete this quiz?")) return;
    try {
      await api(`/api/admin/study/quizzes/${quiz._id}`, { method: "DELETE" });
      router.replace(quiz.chapterId ? `/admin/study/chapters/${quiz.chapterId}` : "/admin/study/quizzes");
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Quiz settings">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Type">
              <select className={inputClass} value={quiz.kind} onChange={(e) => set("kind", e.target.value as QuizData["kind"])}>
                <option value="practice">Practice quiz (untimed)</option>
                <option value="test">Timed test</option>
              </select>
            </Field>
            {quiz.kind === "test" && (
              <Field label="Time limit (minutes)">
                <input type="number" min={1} className={inputClass} value={quiz.durationMinutes ?? ""} onChange={(e) => set("durationMinutes", e.target.value ? Number(e.target.value) : null)} />
              </Field>
            )}
            <Field label="Chapter">
              <select className={inputClass} value={quiz.chapterId ?? ""} onChange={(e) => set("chapterId", e.target.value || null)}>
                <option value="">— none (covers several chapters) —</option>
                {chapters.map((c) => (
                  <option key={c._id} value={c._id}>
                    Class {c.classLevel} · {biLabel(c.title)}
                  </option>
                ))}
              </select>
            </Field>
            <ClassSelect value={linkedChapter?.classLevel ?? quiz.classLevel} onChange={(v) => set("classLevel", v)} disabled={Boolean(linkedChapter)} />
          </div>
          <BilingualField label="Title" value={quiz.title} onChange={(v) => set("title", v)} />
          <BilingualField label="Instructions / description" value={quiz.description} onChange={(v) => set("description", v)} multiline rows={2} />
          {!linkedChapter && <BoardChecks value={quiz.boards} onChange={(v) => set("boards", v)} />}
          <PublishToggle value={quiz.isPublished} onChange={(v) => set("isPublished", v)} />
        </div>
      </Card>

      <Card title={`Questions (${quiz.questions.length})`} actions={<Button onClick={() => set("questions", [...quiz.questions, newQuestion()])}>+ Add question</Button>}>
        <div className="space-y-3">
          {quiz.questions.length === 0 && <p className="text-sm text-stone-500">No questions yet.</p>}
          {quiz.questions.map((q, i) => (
            <QuestionEditor
              key={q._id ?? `new-${i}`}
              index={i}
              q={q}
              count={quiz.questions.length}
              onChange={(nq) => setQuestion(i, nq)}
              onRemove={() => set("questions", quiz.questions.filter((_, j) => j !== i))}
              onMove={(dir) => {
                const next = [...quiz.questions];
                [next[i], next[i + dir]] = [next[i + dir], next[i]];
                set("questions", next);
              }}
            />
          ))}
          {quiz.questions.length > 0 && (
            <Button variant="secondary" onClick={() => set("questions", [...quiz.questions, newQuestion()])}>
              + Add question
            </Button>
          )}
        </div>
      </Card>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-stone-200 bg-stone-50 py-3">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save quiz"}
        </Button>
        {quiz._id && (
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <ErrorBox error={error} />
          <Notice message={message} />
        </div>
      </div>
    </div>
  );
}

export function QuizEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const isNew = id === "new";
  const chapterId = search.get("chapterId");
  const kind = search.get("kind") === "test" ? "test" : "practice";

  const { data, error } = useAsync(async () => {
    const chapters = (await api<{ items: { _id: string; title: Bi; classLevel: string }[] }>("/api/admin/study/chapters")).items;
    const quiz: QuizData = isNew
      ? {
          kind: chapterId ? "practice" : kind,
          chapterId: chapterId ?? null,
          classLevel: chapters.find((c) => c._id === chapterId)?.classLevel ?? "12",
          boards: [],
          order: 1,
          title: emptyBi(),
          description: emptyBi(),
          durationMinutes: kind === "test" ? 30 : null,
          questions: [newQuestion()],
          isPublished: false,
        }
      : await api<{ item: QuizData }>(`/api/admin/study/quizzes/${id}`).then(({ item }) => ({
          ...item,
          chapterId: item.chapterId ?? null,
          durationMinutes: item.durationMinutes ?? null,
          description: item.description ?? emptyBi(),
          questions: item.questions.map((q) => ({ ...q, explanation: q.explanation ?? emptyBi() })),
        }));
    return { chapters, quiz };
  }, [id, chapterId, kind]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <p className="text-stone-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <Link href={data.quiz.chapterId ? `/admin/study/chapters/${data.quiz.chapterId}` : "/admin/study/quizzes"} className="text-sm text-emerald-800 underline">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold">{isNew ? (data.quiz.kind === "test" ? "New timed test" : "New practice quiz") : biLabel(data.quiz.title)}</h1>
      <QuizForm key={data.quiz._id ?? "new"} initial={data.quiz} chapters={data.chapters} />
    </div>
  );
}
