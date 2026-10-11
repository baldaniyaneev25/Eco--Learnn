"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { api } from "@/lib/client/api";
import { Button, Card, ErrorBox, Field, inputClass, Notice, useAsync } from "../ui";
import { BilingualField, describeError, emptyBi, PublishToggle, type Bi } from "./shared";

interface NoteData {
  _id?: string;
  chapterId: string;
  order: number;
  title: Bi;
  body: Bi;
  pdfUrl: Bi;
  isPublished: boolean;
}

function NoteForm({ initial, onSaved }: { initial: NoteData; onSaved: (note: NoteData, created: boolean) => void }) {
  const router = useRouter();
  const [note, setNote] = useState<NoteData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof NoteData>(k: K, v: NoteData[K]) => setNote((n) => ({ ...n, [k]: v }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = { chapterId: note.chapterId, order: note.order, title: note.title, body: note.body, pdfUrl: note.pdfUrl, isPublished: note.isPublished };
      const { item } = await api<{ item: NoteData }>(note._id ? `/api/admin/study/notes/${note._id}` : "/api/admin/study/notes", {
        method: note._id ? "PUT" : "POST",
        json: payload,
      });
      onSaved(item, !note._id);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!note._id || !window.confirm("Delete this note?")) return;
    try {
      await api(`/api/admin/study/notes/${note._id}`, { method: "DELETE" });
      router.replace(`/admin/study/chapters/${note.chapterId}`);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="space-y-3">
      <ErrorBox error={error} />
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Order in chapter">
          <input type="number" min={0} className={inputClass} value={note.order} onChange={(e) => set("order", Number(e.target.value))} />
        </Field>
      </div>
      <BilingualField label="Note title" value={note.title} onChange={(v) => set("title", v)} />
      <BilingualField
        label="Note text"
        value={note.body}
        onChange={(v) => set("body", v)}
        multiline
        rows={16}
        hint="Plain text. Leave an empty line between paragraphs; start lines with 1. 2. 3. for numbered points."
      />
      <BilingualField label="PDF link (optional)" value={note.pdfUrl} onChange={(v) => set("pdfUrl", v)} hint="An https:// link to a PDF the students can open, e.g. from Google Drive (set to 'Anyone with the link')." />
      <PublishToggle value={note.isPublished} onChange={(v) => set("isPublished", v)} />
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save note"}
        </Button>
        {note._id && (
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

export function NoteEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const search = useSearchParams();
  const router = useRouter();
  const chapterId = search.get("chapterId") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const { data, error } = useAsync(
    async () =>
      isNew
        ? ({ chapterId, order: 1, title: emptyBi(), body: emptyBi(), pdfUrl: emptyBi(), isPublished: false } satisfies NoteData)
        : (await api<{ item: NoteData }>(`/api/admin/study/notes/${id}`)).item,
    [id, chapterId],
  );

  if (error) return <ErrorBox error={error} />;
  if (!data) return <p className="text-stone-500">Loading…</p>;
  if (!data.chapterId) return <ErrorBox error="Open this page from a chapter (Add note)." />;

  return (
    <div className="space-y-4">
      <Link href={`/admin/study/chapters/${data.chapterId}`} className="text-sm text-emerald-800 underline">
        ← Back to chapter
      </Link>
      <h1 className="text-2xl font-bold">{isNew ? "New note" : "Edit note"}</h1>
      <Notice message={message} />
      <Card>
        <NoteForm
          initial={{ ...data, pdfUrl: data.pdfUrl ?? emptyBi() }}
          onSaved={(note, created) => {
            if (created) router.replace(`/admin/study/notes/${note._id}`);
            setMessage("Note saved.");
          }}
        />
      </Card>
    </div>
  );
}
