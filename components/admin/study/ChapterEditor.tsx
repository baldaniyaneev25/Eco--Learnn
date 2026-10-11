"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { api, formatDate } from "@/lib/client/api";
import { Badge, Button, Card, ErrorBox, Field, inputClass, Notice, useAsync } from "../ui";
import { BilingualField, BoardChecks, biLabel, ClassSelect, describeError, PublishToggle, type Bi } from "./shared";

interface ChapterDetail {
  chapter: { _id: string; classLevel: string; boards: string[]; order: number; title: Bi; description: Bi; isPublished: boolean };
  notes: { _id: string; title: Bi; order: number; isPublished: boolean; updatedAt: string }[];
  quizzes: { _id: string; title: Bi; kind: string; order: number; isPublished: boolean; questionCount: number; updatedAt: string }[];
}

function ChapterForm({ detail, onSaved }: { detail: ChapterDetail; onSaved: (msg: string) => void }) {
  const c = detail.chapter;
  const router = useRouter();
  const [classLevel, setClassLevel] = useState(c.classLevel);
  const [order, setOrder] = useState(c.order);
  const [title, setTitle] = useState<Bi>(c.title);
  const [description, setDescription] = useState<Bi>(c.description);
  const [boards, setBoards] = useState<string[]>(c.boards);
  const [isPublished, setIsPublished] = useState(c.isPublished);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await api(`/api/admin/study/chapters/${c._id}`, { method: "PUT", json: { classLevel, order, title, description, boards, isPublished } });
      onSaved("Chapter saved.");
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function remove() {
    if (!window.confirm("Delete this chapter? This cannot be undone.")) return;
    setError(null);
    try {
      await api(`/api/admin/study/chapters/${c._id}`, { method: "DELETE" });
      router.replace("/admin/study");
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="space-y-3">
      <ErrorBox error={error} />
      <div className="grid gap-3 md:grid-cols-3">
        <ClassSelect value={classLevel} onChange={setClassLevel} />
        <Field label="Order in list">
          <input type="number" min={0} className={inputClass} value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        </Field>
      </div>
      <BilingualField label="Chapter title" value={title} onChange={setTitle} />
      <BilingualField label="Short description" value={description} onChange={setDescription} multiline rows={2} />
      <BoardChecks value={boards} onChange={setBoards} />
      <PublishToggle value={isPublished} onChange={setIsPublished} />
      <div className="flex gap-2">
        <Button onClick={save}>Save chapter</Button>
        <Button variant="danger" onClick={remove}>
          Delete
        </Button>
      </div>
    </div>
  );
}

export function ChapterEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, reload } = useAsync(() => api<ChapterDetail>(`/api/admin/study/chapters/${id}`), [id]);
  const [message, setMessage] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <p className="text-stone-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <Link href="/admin/study" className="text-sm text-emerald-800 underline">
        ← All chapters
      </Link>
      <h1 className="text-2xl font-bold">
        Class {data.chapter.classLevel} · {biLabel(data.chapter.title)}
      </h1>
      <Notice message={message} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Chapter details">
          <ChapterForm
            key={formKey}
            detail={data}
            onSaved={(msg) => {
              setMessage(msg);
              setFormKey((k) => k + 1);
              reload();
            }}
          />
        </Card>
        <div className="space-y-4">
          <Card title={`Notes (${data.notes.length})`} actions={<Link href={`/admin/study/notes/new?chapterId=${id}`} className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">Add note</Link>}>
            {data.notes.length === 0 ? (
              <p className="text-sm text-stone-500">No notes yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {data.notes.map((n) => (
                  <li key={n._id} className="flex items-center gap-2 py-2">
                    <span className="w-6 text-stone-400">{n.order}</span>
                    <Link href={`/admin/study/notes/${n._id}`} className="mr-auto text-emerald-900 hover:underline">
                      {biLabel(n.title)}
                    </Link>
                    <span className="text-xs text-stone-400">{formatDate(n.updatedAt)}</span>
                    {n.isPublished ? <Badge tone="green">published</Badge> : <Badge>draft</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={`Quizzes (${data.quizzes.length})`} actions={<Link href={`/admin/study/quizzes/new?chapterId=${id}`} className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">Add quiz</Link>}>
            {data.quizzes.length === 0 ? (
              <p className="text-sm text-stone-500">No quizzes yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {data.quizzes.map((q) => (
                  <li key={q._id} className="flex items-center gap-2 py-2">
                    <Link href={`/admin/study/quizzes/${q._id}`} className="mr-auto text-emerald-900 hover:underline">
                      {biLabel(q.title)}
                    </Link>
                    <span className="text-xs text-stone-500">{q.questionCount} questions</span>
                    <Badge tone={q.kind === "test" ? "violet" : "blue"}>{q.kind}</Badge>
                    {q.isPublished ? <Badge tone="green">published</Badge> : <Badge>draft</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
