"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CLASS_LEVELS } from "@/config/categories";
import { api } from "@/lib/client/api";
import { Badge, Button, Card, ErrorBox, Field, inputClass, Notice, useAsync } from "../ui";
import { BilingualField, BoardChecks, biLabel, ClassSelect, describeError, emptyBi, type Bi } from "./shared";

interface ChapterRow {
  _id: string;
  classLevel: string;
  boards: string[];
  order: number;
  title: Bi;
  isPublished: boolean;
  noteCount: number;
  quizCount: number;
}

function NewChapterForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [classLevel, setClassLevel] = useState("12");
  const [title, setTitle] = useState<Bi>(emptyBi());
  const [description, setDescription] = useState<Bi>(emptyBi());
  const [boards, setBoards] = useState<string[]>([]);
  const [order, setOrder] = useState(1);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    try {
      const { item } = await api<{ item: { _id: string } }>("/api/admin/study/chapters", {
        method: "POST",
        json: { classLevel, title, description, boards, order, isPublished: false },
      });
      onCreated(item._id);
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
      <p className="text-xs text-stone-500">New chapters start unpublished. Add notes and a quiz, then publish.</p>
      <Button onClick={create}>Create chapter</Button>
    </div>
  );
}

export function ChaptersAdmin() {
  const [classLevel, setClassLevel] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const { data, error, reload } = useAsync(
    () => api<{ items: ChapterRow[] }>(`/api/admin/study/chapters${classLevel ? `?class=${classLevel}` : ""}`),
    [classLevel],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Study content · Chapters &amp; notes</h1>
        <select className={`${inputClass} w-auto`} value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
          <option value="">All classes</option>
          {CLASS_LEVELS.map((c) => (
            <option key={c} value={c}>
              Class {c}
            </option>
          ))}
        </select>
        <Link href="/admin/study/quizzes" className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm">
          Quizzes &amp; tests
        </Link>
        <Button onClick={() => setCreating((c) => !c)}>{creating ? "Close" : "New chapter"}</Button>
      </div>
      <p className="text-sm text-stone-600">
        Students see published chapters for their class and board in the app: notes to read, then a practice quiz.
      </p>
      <Notice message={message} />
      <ErrorBox error={error} />
      {creating && (
        <Card title="New chapter">
          <NewChapterForm
            onCreated={(id) => {
              setCreating(false);
              setMessage("Chapter created.");
              router.push(`/admin/study/chapters/${id}`);
            }}
          />
        </Card>
      )}
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Chapter</th>
              <th className="px-3 py-2">Boards</th>
              <th className="px-3 py-2 text-right">Notes</th>
              <th className="px-3 py-2 text-right">Quizzes</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-stone-500">
                  No chapters yet. Click “New chapter”.
                </td>
              </tr>
            )}
            {data?.items.map((c) => (
              <tr key={c._id} className="border-t border-stone-100">
                <td className="px-3 py-2">{c.classLevel}</td>
                <td className="px-3 py-2">{c.order}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/study/chapters/${c._id}`} className="font-medium text-emerald-900 hover:underline">
                    {biLabel(c.title)}
                  </Link>
                  {c.title.en && c.title.gu && <div className="text-xs text-stone-500">{c.title.gu}</div>}
                  {(!c.title.en || !c.title.gu) && <div className="text-xs text-amber-700">Missing {c.title.en ? "Gujarati" : "English"} title</div>}
                </td>
                <td className="px-3 py-2 text-xs">{c.boards.length ? c.boards.join(", ") : "All"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{c.noteCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{c.quizCount}</td>
                <td className="px-3 py-2">{c.isPublished ? <Badge tone="green">published</Badge> : <Badge>draft</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="ghost" onClick={reload}>
        Refresh
      </Button>
    </div>
  );
}
