"use client";

import Link from "next/link";
import { use, useState } from "react";
import { BOARDS, CATEGORIES, CLASS_LEVELS, DIFFICULTIES, SECTIONS } from "@/config/categories";
import { api, formatDate } from "@/lib/client/api";
import { Badge, Button, Card, ErrorBox, Field, inputClass, Notice, StatusBadge, useAsync } from "./ui";

interface Publication {
  section: string;
  title: string;
  summary: string;
  category: string;
  classLevels: string[];
  boards: string[];
  difficulty?: string;
}

interface ItemDetail {
  item: {
    _id: string;
    sourceId: string;
    sourceName: string;
    externalId: string;
    canonicalUrl: string;
    title: string;
    originalLanguage: "en" | "gu";
    originalText: string;
    contentPolicy: string;
    summaryDraft: string;
    category: string;
    suggestedSection: string;
    relevanceScore: number;
    publishedAt?: string;
    retrievedAt: string;
    contentFingerprint: string;
    flags: Record<string, boolean>;
    isSample: boolean;
    reviewStatus: string;
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    publication?: Publication;
    publishedToStudentsAt?: string;
    publicationHistory: { version: number; action: string; snapshot?: Publication; reviewStatus: string; editedBy: string; editedAt: string; note?: string }[];
  };
  source: { name: string; sourceType: string; baseUrl: string; isSample: boolean; accessReview?: { license?: string; termsUrl?: string } } | null;
  translations: { _id: string; language: string; translatedTitle: string; translatedSummary: string; translationMethod: string; reviewStatus: string; reviewedBy?: string; provider?: string; updatedAt: string }[];
  auditLog: { _id: string; action: string; actorEmail: string; summary: string; createdAt: string }[];
}

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function PublishForm({ detail, onSaved }: { detail: ItemDetail; onSaved: (msg: string) => void }) {
  const { item } = detail;
  const isApproved = item.reviewStatus === "approved";
  const [pub, setPub] = useState<Publication>(
    item.publication ?? {
      section: item.suggestedSection,
      title: item.title,
      summary: "",
      category: item.category,
      classLevels: [],
      boards: [],
      difficulty: item.suggestedSection === "learning-resource" ? "beginner" : undefined,
    },
  );
  const [factChecked, setFactChecked] = useState(false);
  const [academicReviewed, setAcademicReviewed] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Publication>(k: K, v: Publication[K]) => setPub((p) => ({ ...p, [k]: v }));

  async function submit(action: "approve" | "edit") {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/imported-items/${item._id}/review`, {
        method: "PATCH",
        json: {
          action,
          ...pub,
          difficulty: pub.section === "learning-resource" ? pub.difficulty : undefined,
          ...(action === "approve" ? { factChecked, academicReviewed } : {}),
          ...(note ? { note } : {}),
        },
      });
      onSaved(action === "approve" ? "Approved and published to students" : "Publication updated (new version saved)");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <ErrorBox error={error} />
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Student section">
          <select className={inputClass} value={pub.section} onChange={(e) => set("section", e.target.value)}>
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Topic category">
          <select className={inputClass} value={pub.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label.en}
              </option>
            ))}
          </select>
        </Field>
        {pub.section === "learning-resource" && (
          <Field label="Difficulty">
            <select className={inputClass} value={pub.difficulty ?? "beginner"} onChange={(e) => set("difficulty", e.target.value)}>
              {DIFFICULTIES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <Field label={`Title (${item.originalLanguage === "gu" ? "Gujarati" : "English"})`}>
        <input className={inputClass} value={pub.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label="Original summary for students" hint="Write in your own words (min 20 characters). Long verbatim passages from the source are rejected.">
        <textarea className={inputClass} rows={4} value={pub.summary} onChange={(e) => set("summary", e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-6 text-sm">
        <fieldset>
          <legend className="font-medium">Class relevance (none = all)</legend>
          {CLASS_LEVELS.map((c) => (
            <label key={c} className="mr-3 inline-flex items-center gap-1">
              <input type="checkbox" checked={pub.classLevels.includes(c)} onChange={() => set("classLevels", toggle(pub.classLevels, c))} />
              {c}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="font-medium">Boards (none = all)</legend>
          {BOARDS.map((b) => (
            <label key={b} className="mr-3 inline-flex items-center gap-1">
              <input type="checkbox" checked={pub.boards.includes(b)} onChange={() => set("boards", toggle(pub.boards, b))} />
              {b}
            </label>
          ))}
        </fieldset>
      </div>
      {!isApproved && (
        <div className="space-y-1 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          {item.flags.needsFactCheck && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={factChecked} onChange={(e) => setFactChecked(e.target.checked)} />
              I checked all figures, dates and names against the original source
            </label>
          )}
          {pub.section === "learning-resource" && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={academicReviewed} onChange={(e) => setAcademicReviewed(e.target.checked)} />
              Academic review done: accurate and suitable for the selected classes
            </label>
          )}
          {!item.flags.needsFactCheck && pub.section !== "learning-resource" && <p>No mandatory checks for this item.</p>}
        </div>
      )}
      <Field label="Review note (optional)">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button disabled={busy} onClick={() => submit(isApproved ? "edit" : "approve")}>
        {isApproved ? "Save edit" : "Approve & publish"}
      </Button>
    </div>
  );
}

function TranslationPanel({ detail, onSaved }: { detail: ItemDetail; onSaved: (msg: string) => void }) {
  const { item } = detail;
  const target = item.originalLanguage === "en" ? "gu" : "en";
  const existing = detail.translations.find((t) => t.language === target);
  const [title, setTitle] = useState(existing?.translatedTitle ?? "");
  const [summary, setSummary] = useState(existing?.translatedSummary ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save(reviewStatus: "draft" | "approved" | "rejected") {
    setError(null);
    try {
      await api(`/api/admin/imported-items/${item._id}/translations`, {
        method: "PUT",
        json: { language: target, translatedTitle: title, translatedSummary: summary, reviewStatus },
      });
      onSaved(`Translation saved (${reviewStatus})`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Translate the approved student summary into {target === "gu" ? "Gujarati" : "English"}. Keep names, units, dates and numbers exactly as in the
        original. Only approved translations are shown to students, labelled as an EcoLearn translation.
      </p>
      {existing && (
        <p className="flex flex-wrap items-center gap-2 text-xs">
          Current: <StatusBadge status={existing.reviewStatus} /> <Badge tone={existing.translationMethod === "machine" ? "amber" : "blue"}>{existing.translationMethod}</Badge>
          {existing.provider && <span className="text-stone-500">{existing.provider}</span>}
          <span className="text-stone-500">updated {formatDate(existing.updatedAt, "en", true)}</span>
        </p>
      )}
      <ErrorBox error={error} />
      <Field label="Translated title">
        <input lang={target} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Translated summary">
        <textarea lang={target} className={inputClass} rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => save("draft")} disabled={!title}>
          Save draft
        </Button>
        <Button onClick={() => save("approved")} disabled={!title}>
          Approve translation
        </Button>
        {existing && (
          <Button variant="danger" onClick={() => save("rejected")}>
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}

export function ItemReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, reload } = useAsync(() => api<ItemDetail>(`/api/admin/imported-items/${id}`), [id]);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [formKey, setFormKey] = useState(0);

  const saved = (msg: string) => {
    setMessage(msg);
    setFormKey((k) => k + 1);
    reload();
  };

  async function act(json: Record<string, unknown>, msg: string) {
    setActionError(null);
    try {
      await api(`/api/admin/imported-items/${id}/review`, { method: "PATCH", json });
      saved(msg);
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  if (error) return <ErrorBox error={error} />;
  if (!data) return <p className="text-stone-500">Loading…</p>;
  const { item, source } = data;

  return (
    <div className="space-y-4">
      <Link href="/admin/web-data/review" className="text-sm text-emerald-800 underline">
        ← Review queue
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold" lang={item.originalLanguage}>
          {item.title}
        </h1>
        <StatusBadge status={item.reviewStatus} />
        {item.isSample && <Badge tone="amber">sample data</Badge>}
      </div>
      <Notice message={message} />
      <ErrorBox error={actionError} />
      {item.flags.sourceUpdatedAfterReview && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          The source changed this item after it was reviewed. Compare the original text below and save an edit to confirm.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card title="Original source content (read-only, plain text)">
            <p className="mb-2 text-xs text-stone-500">
              Stored under the “{item.contentPolicy}” policy. Imported text is untrusted: it is displayed as plain text and never executed.
            </p>
            <div lang={item.originalLanguage} className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded bg-stone-50 p-3 text-sm">
              {item.originalText || <em className="text-stone-500">No text stored (metadata only).</em>}
            </div>
            {item.summaryDraft && (
              <p className="mt-2 text-xs text-stone-600">
                <strong>Excerpt draft:</strong> {item.summaryDraft}
              </p>
            )}
          </Card>
          <Card title="Provenance">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-stone-500">Source</dt>
              <dd>
                {source ? (
                  <>
                    {source.name} ({source.sourceType})
                    {source.accessReview?.license && <span className="text-stone-500"> · {source.accessReview.license}</span>}
                  </>
                ) : (
                  item.sourceName
                )}
              </dd>
              <dt className="text-stone-500">Original link</dt>
              <dd className="break-all">
                {item.isSample ? (
                  <span className="text-stone-500">{item.canonicalUrl} (sample, not a real page)</span>
                ) : (
                  <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-emerald-800 underline">
                    {item.canonicalUrl}
                  </a>
                )}
              </dd>
              <dt className="text-stone-500">External ID</dt>
              <dd className="break-all text-xs">{item.externalId}</dd>
              <dt className="text-stone-500">Published</dt>
              <dd>{formatDate(item.publishedAt, "en", true)}</dd>
              <dt className="text-stone-500">Retrieved</dt>
              <dd>{formatDate(item.retrievedAt, "en", true)}</dd>
              <dt className="text-stone-500">Language</dt>
              <dd>{item.originalLanguage === "gu" ? "Gujarati" : "English"}</dd>
              <dt className="text-stone-500">Classifier</dt>
              <dd>
                {item.category} · relevance {item.relevanceScore} · suggested {item.suggestedSection}
              </dd>
              <dt className="text-stone-500">Fingerprint</dt>
              <dd className="font-mono text-xs">{item.contentFingerprint.slice(0, 16)}…</dd>
              <dt className="text-stone-500">Reviewed</dt>
              <dd>{item.reviewedBy ? `${item.reviewedBy}, ${formatDate(item.reviewedAt, "en", true)}` : "—"}</dd>
              {item.rejectionReason && (
                <>
                  <dt className="text-stone-500">Rejection reason</dt>
                  <dd>{item.rejectionReason}</dd>
                </>
              )}
            </dl>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={item.reviewStatus === "approved" ? "Published version (edit)" : "Approve for students"}>
            <PublishForm key={formKey} detail={data} onSaved={saved} />
          </Card>
          <Card title="Other actions">
            <div className="flex flex-wrap items-end gap-2">
              <input className={`${inputClass} max-w-sm`} placeholder="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button variant="danger" disabled={reason.trim().length < 3 || item.reviewStatus === "rejected"} onClick={() => act({ action: "reject", reason }, "Item rejected")}>
                Reject
              </Button>
              <Button variant="secondary" disabled={item.reviewStatus === "archived"} onClick={() => act({ action: "archive" }, "Item archived and hidden from students")}>
                Archive
              </Button>
            </div>
          </Card>
          <Card title="Translation">
            <TranslationPanel key={formKey} detail={data} onSaved={saved} />
          </Card>
        </div>
      </div>

      <Card title="Publication history">
        {item.publicationHistory.length === 0 ? (
          <p className="text-sm text-stone-500">No review actions yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {[...item.publicationHistory].reverse().map((h) => (
              <li key={h.version} className="flex flex-wrap items-start gap-2 border-b border-stone-100 pb-2">
                <Badge>v{h.version}</Badge>
                <strong>{h.action}</strong>
                <span className="text-stone-500">
                  by {h.editedBy}, {formatDate(h.editedAt, "en", true)}
                </span>
                {h.note && <span className="text-stone-600">— {h.note}</span>}
                {h.snapshot?.title && <span className="w-full text-xs text-stone-500">“{h.snapshot.title}”</span>}
                {h.snapshot?.title && (
                  <Button variant="ghost" className="ml-auto" onClick={() => act({ action: "rollback", version: h.version }, `Rolled back to version ${h.version}`)}>
                    Roll back to this version
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-stone-600">Audit trail ({data.auditLog.length})</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {data.auditLog.map((a) => (
              <li key={a._id}>
                {formatDate(a.createdAt, "en", true)} · <strong>{a.action}</strong> · {a.actorEmail} · {a.summary}
              </li>
            ))}
          </ul>
        </details>
      </Card>
    </div>
  );
}
