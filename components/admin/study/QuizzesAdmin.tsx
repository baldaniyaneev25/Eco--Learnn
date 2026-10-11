"use client";

import Link from "next/link";
import { useState } from "react";
import { CLASS_LEVELS } from "@/config/categories";
import { api, formatDate } from "@/lib/client/api";
import { Badge, ErrorBox, inputClass, useAsync } from "../ui";
import { biLabel, type Bi } from "./shared";

interface QuizRow {
  _id: string;
  kind: "practice" | "test";
  classLevel: string;
  title: Bi;
  chapterTitle: Bi | null;
  durationMinutes?: number;
  questionCount: number;
  isPublished: boolean;
  attempts: number;
  averagePercent: number | null;
  updatedAt: string;
}

export function QuizzesAdmin() {
  const [kind, setKind] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const { data, error } = useAsync(() => {
    const p = new URLSearchParams();
    if (kind) p.set("kind", kind);
    if (classLevel) p.set("class", classLevel);
    return api<{ items: QuizRow[] }>(`/api/admin/study/quizzes?${p}`);
  }, [kind, classLevel]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Study content · Quizzes &amp; tests</h1>
        <select className={`${inputClass} w-auto`} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Practice quizzes and tests</option>
          <option value="practice">Practice quizzes</option>
          <option value="test">Timed tests</option>
        </select>
        <select className={`${inputClass} w-auto`} value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
          <option value="">All classes</option>
          {CLASS_LEVELS.map((c) => (
            <option key={c} value={c}>
              Class {c}
            </option>
          ))}
        </select>
        <Link href="/admin/study/quizzes/new?kind=test" className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">
          New timed test
        </Link>
      </div>
      <p className="text-sm text-stone-600">
        Practice quizzes belong to a chapter (add them from the chapter page). Timed tests (mock tests) can cover several chapters.
      </p>
      <ErrorBox error={error} />
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2 text-right">Questions</th>
              <th className="px-3 py-2 text-right">Attempts</th>
              <th className="px-3 py-2 text-right">Avg score</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-stone-500">
                  Nothing yet.
                </td>
              </tr>
            )}
            {data?.items.map((q) => (
              <tr key={q._id} className="border-t border-stone-100">
                <td className="px-3 py-2">
                  <Link href={`/admin/study/quizzes/${q._id}`} className="font-medium text-emerald-900 hover:underline">
                    {biLabel(q.title)}
                  </Link>
                  <div className="text-xs text-stone-500">
                    {q.chapterTitle ? `Chapter: ${biLabel(q.chapterTitle)}` : "No chapter"} · updated {formatDate(q.updatedAt)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={q.kind === "test" ? "violet" : "blue"}>{q.kind === "test" ? `test · ${q.durationMinutes} min` : "practice"}</Badge>
                </td>
                <td className="px-3 py-2">{q.classLevel}</td>
                <td className="px-3 py-2 text-right tabular-nums">{q.questionCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{q.attempts}</td>
                <td className="px-3 py-2 text-right tabular-nums">{q.averagePercent === null ? "—" : `${q.averagePercent}%`}</td>
                <td className="px-3 py-2">{q.isPublished ? <Badge tone="green">published</Badge> : <Badge>draft</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
