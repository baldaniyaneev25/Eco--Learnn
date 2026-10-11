"use client";

import Link from "next/link";
import { useState } from "react";
import { CONTENT_POLICIES, SOURCE_TYPES } from "@/config/approved-sources";
import { CATEGORIES, SECTIONS } from "@/config/categories";
import { WORLD_BANK_INDICATORS } from "@/config/worldbank-indicators";
import { api, formatDate, timeAgo } from "@/lib/client/api";
import { useStaff } from "./AdminShell";
import { Badge, Button, Card, ErrorBox, Field, inputClass, Notice, StatusBadge, useAsync } from "./ui";

interface SourceRow {
  _id: string;
  name: string;
  sourceType: (typeof SOURCE_TYPES)[number];
  baseUrl: string;
  integrationConfig: {
    feedUrl?: string;
    indicators?: string[];
    country?: string;
    dataset?: string;
    language: "en" | "gu";
    contentPolicy: (typeof CONTENT_POLICIES)[number];
    defaultSection: (typeof SECTIONS)[number];
  };
  categories: string[];
  isEnabled: boolean;
  isSample: boolean;
  fetchIntervalMinutes: number;
  minIntervalMinutes: number | null;
  accessReview?: { termsUrl?: string; license?: string; notes?: string; termsReviewed?: boolean; reviewedBy?: string; reviewedAt?: string };
  lastFetchedAt?: string;
  lastSuccessfulFetchAt?: string;
  nextRunAt?: string;
  consecutiveFailures: number;
  lastError?: string;
  alertActive: boolean;
  isSyncing: boolean;
  freshness: "fresh" | "stale" | "never";
  itemCounts: Record<string, number>;
  quality: { recentJobs: number; failureRate: number; duplicateRate: number } | null;
}

type FormState = {
  name: string;
  sourceType: SourceRow["sourceType"];
  baseUrl: string;
  feedUrl: string;
  indicators: string[];
  country: string;
  dataset: string;
  language: "en" | "gu";
  contentPolicy: SourceRow["integrationConfig"]["contentPolicy"];
  defaultSection: SourceRow["integrationConfig"]["defaultSection"];
  categories: string[];
  isEnabled: boolean;
  fetchIntervalMinutes: number;
  termsUrl: string;
  license: string;
  notes: string;
  termsReviewed: boolean;
};

const EMPTY: FormState = {
  name: "",
  sourceType: "rss",
  baseUrl: "https://",
  feedUrl: "https://",
  indicators: [],
  country: "IND",
  dataset: "sample-news",
  language: "en",
  contentPolicy: "excerpt",
  defaultSection: "news",
  categories: [],
  isEnabled: false,
  fetchIntervalMinutes: 180,
  termsUrl: "",
  license: "",
  notes: "",
  termsReviewed: false,
};

function toForm(s: SourceRow): FormState {
  return {
    name: s.name,
    sourceType: s.sourceType,
    baseUrl: s.baseUrl,
    feedUrl: s.integrationConfig.feedUrl ?? "",
    indicators: s.integrationConfig.indicators ?? [],
    country: s.integrationConfig.country ?? "IND",
    dataset: s.integrationConfig.dataset ?? "sample-news",
    language: s.integrationConfig.language,
    contentPolicy: s.integrationConfig.contentPolicy,
    defaultSection: s.integrationConfig.defaultSection,
    categories: s.categories,
    isEnabled: s.isEnabled,
    fetchIntervalMinutes: s.fetchIntervalMinutes,
    termsUrl: s.accessReview?.termsUrl ?? "",
    license: s.accessReview?.license ?? "",
    notes: s.accessReview?.notes ?? "",
    termsReviewed: Boolean(s.accessReview?.termsReviewed),
  };
}

function toPayload(f: FormState, isNew: boolean) {
  const integrationConfig: Record<string, unknown> = {
    language: f.language,
    contentPolicy: f.contentPolicy,
    defaultSection: f.defaultSection,
  };
  if (f.sourceType === "rss") integrationConfig.feedUrl = f.feedUrl;
  if (f.sourceType === "worldbank") Object.assign(integrationConfig, { indicators: f.indicators, country: f.country.toUpperCase() });
  if (f.sourceType === "sample") integrationConfig.dataset = f.dataset;
  const accessReview: Record<string, unknown> = { termsReviewed: f.termsReviewed };
  if (f.termsUrl) accessReview.termsUrl = f.termsUrl;
  if (f.license) accessReview.license = f.license;
  if (f.notes) accessReview.notes = f.notes;
  return {
    name: f.name,
    ...(isNew ? { sourceType: f.sourceType } : {}),
    ...(f.sourceType === "rss" ? { baseUrl: f.baseUrl } : {}),
    integrationConfig,
    categories: f.categories,
    isEnabled: f.isEnabled,
    fetchIntervalMinutes: Number(f.fetchIntervalMinutes),
    accessReview,
  };
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function SourceForm({ initial, id, onDone }: { initial: FormState; id?: string; onDone: (msg: string) => void }) {
  const [f, setF] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(id ? `/api/admin/data-sources/${id}` : "/api/admin/data-sources", {
        method: id ? "PATCH" : "POST",
        json: toPayload(f, !id),
      });
      onDone(id ? "Source updated" : "Source created");
    } catch (err) {
      const e = err as Error & { details?: { fieldErrors?: Record<string, string[]> } };
      const fields = e.details?.fieldErrors ? ` — ${JSON.stringify(e.details.fieldErrors)}` : "";
      setError(e.message + fields);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <ErrorBox error={error} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Integration type" hint={id ? "Type cannot be changed after creation" : "Only approved integration types are available"}>
          <select className={inputClass} disabled={Boolean(id)} value={f.sourceType} onChange={(e) => set("sourceType", e.target.value as FormState["sourceType"])}>
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "rss" ? "RSS / Atom feed" : t === "worldbank" ? "World Bank Indicators API" : "Bundled sample data (demo)"}
              </option>
            ))}
          </select>
        </Field>
        {f.sourceType === "rss" && (
          <>
            <Field label="Base URL" hint="Must be on the approved domain allowlist (https only)">
              <input className={inputClass} value={f.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} />
            </Field>
            <Field label="Feed URL">
              <input className={inputClass} value={f.feedUrl} onChange={(e) => set("feedUrl", e.target.value)} />
            </Field>
          </>
        )}
        {f.sourceType === "worldbank" && (
          <Field label="Country (ISO code)">
            <input className={inputClass} value={f.country} onChange={(e) => set("country", e.target.value)} />
          </Field>
        )}
        {f.sourceType === "sample" && (
          <Field label="Sample dataset">
            <select className={inputClass} value={f.dataset} onChange={(e) => set("dataset", e.target.value)}>
              <option value="sample-news">sample-news</option>
              <option value="sample-indicators">sample-indicators</option>
            </select>
          </Field>
        )}
        <Field label="Default language">
          <select className={inputClass} value={f.language} onChange={(e) => set("language", e.target.value as "en" | "gu")}>
            <option value="en">English</option>
            <option value="gu">Gujarati</option>
          </select>
        </Field>
        <Field label="Content storage policy" hint="Capped by what the domain's terms permit">
          <select className={inputClass} value={f.contentPolicy} onChange={(e) => set("contentPolicy", e.target.value as FormState["contentPolicy"])}>
            {CONTENT_POLICIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Default student section">
          <select className={inputClass} value={f.defaultSection} onChange={(e) => set("defaultSection", e.target.value as FormState["defaultSection"])}>
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Fetch interval (minutes)" hint="Cannot be lower than the source's permitted minimum">
          <input type="number" min={1} className={inputClass} value={f.fetchIntervalMinutes} onChange={(e) => set("fetchIntervalMinutes", Number(e.target.value))} />
        </Field>
      </div>

      {f.sourceType === "worldbank" && (
        <fieldset className="text-sm">
          <legend className="mb-1 font-medium">Indicators to import</legend>
          <div className="grid gap-1 md:grid-cols-2">
            {WORLD_BANK_INDICATORS.map((i) => (
              <label key={i.code} className="flex items-center gap-2">
                <input type="checkbox" checked={f.indicators.includes(i.code)} onChange={() => set("indicators", toggle(f.indicators, i.code))} />
                {i.name} <code className="text-xs text-stone-500">{i.code}</code>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {f.sourceType !== "worldbank" && (
        <fieldset className="text-sm">
          <legend className="mb-1 font-medium">Categories to import (none selected = all)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {CATEGORIES.map((c) => (
              <label key={c.code} className="flex items-center gap-1">
                <input type="checkbox" checked={f.categories.includes(c.code)} onChange={() => set("categories", toggle(f.categories, c.code))} />
                {c.label.en}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-2 rounded border border-stone-200 p-3 text-sm">
        <legend className="px-1 font-medium">Access & licensing review</legend>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Terms of use URL">
            <input className={inputClass} value={f.termsUrl} onChange={(e) => set("termsUrl", e.target.value)} />
          </Field>
          <Field label="Licence">
            <input className={inputClass} value={f.license} onChange={(e) => set("license", e.target.value)} />
          </Field>
        </div>
        <Field label="Notes (access method, rate limits, attribution wording)">
          <textarea className={inputClass} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.termsReviewed} onChange={(e) => set("termsReviewed", e.target.checked)} />I have reviewed this
          source&apos;s terms, licence, rate limits and permitted access method
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.isEnabled} onChange={(e) => set("isEnabled", e.target.checked)} />
          Enabled (scheduled fetching)
        </label>
      </fieldset>
      <p className="text-xs text-stone-500">Credentials are never entered here. API keys belong in server environment variables.</p>
      <Button onClick={save} disabled={busy}>
        {busy ? "Saving…" : id ? "Save changes" : "Create source"}
      </Button>
    </div>
  );
}

export function SourcesManager() {
  const staff = useStaff();
  const isAdmin = staff.role === "admin";
  const { data, error, reload } = useAsync(() => api<{ items: SourceRow[] }>("/api/admin/data-sources"), []);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function sync(id: string) {
    setActionError(null);
    try {
      const res = await api<{ existing: boolean }>(`/api/admin/data-sources/${id}/sync`, { method: "POST" });
      setMessage(res.existing ? "A sync is already queued or running for this source." : "Sync queued. Refresh in a moment to see results.");
      setTimeout(reload, 2500);
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function setEnabled(s: SourceRow, isEnabled: boolean) {
    setActionError(null);
    try {
      await api(`/api/admin/data-sources/${s._id}`, { method: "PATCH", json: { isEnabled } });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  const editingSource = data?.items.find((s) => s._id === editing);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Web Data Manager · Data sources</h1>
        <Button variant="secondary" onClick={reload}>
          Refresh
        </Button>
        {isAdmin && <Button onClick={() => setEditing("new")}>Add source</Button>}
      </div>
      <Notice message={message} />
      <ErrorBox error={error ?? actionError} />

      {editing && (
        <Card title={editing === "new" ? "New data source" : `Edit: ${editingSource?.name}`} actions={<Button variant="ghost" onClick={() => setEditing(null)}>Close</Button>}>
          <SourceForm
            key={editing}
            initial={editing === "new" ? EMPTY : toForm(editingSource!)}
            id={editing === "new" ? undefined : editing}
            onDone={(msg) => {
              setMessage(msg);
              setEditing(null);
              reload();
            }}
          />
        </Card>
      )}

      <div className="grid gap-4">
        {data?.items.map((s) => (
          <Card
            key={s._id}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {s.name}
                <Badge tone={s.isEnabled ? "green" : "gray"}>{s.isEnabled ? "enabled" : "disabled"}</Badge>
                <Badge tone="blue">{s.sourceType}</Badge>
                {s.isSample && <Badge tone="amber">sample data</Badge>}
                {s.alertActive && <Badge tone="red">alert</Badge>}
                {s.isSyncing && <Badge tone="blue">syncing…</Badge>}
              </span>
            }
            actions={
              isAdmin && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setEditing(s._id)}>
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => setEnabled(s, !s.isEnabled)}>
                    {s.isEnabled ? "Disable" : "Enable"}
                  </Button>
                  <Button onClick={() => sync(s._id)} disabled={!s.isEnabled || s.isSyncing}>
                    Sync now
                  </Button>
                </div>
              )
            }
          >
            <div className="grid gap-x-6 gap-y-1 text-sm md:grid-cols-3">
              <p>
                <span className="text-stone-500">Endpoint:</span>{" "}
                <span className="break-all">{s.integrationConfig.feedUrl ?? s.baseUrl}</span>
              </p>
              <p>
                <span className="text-stone-500">Freshness:</span> <StatusBadge status={s.freshness} />{" "}
                <span className="text-xs text-stone-500">last success {timeAgo(s.lastSuccessfulFetchAt)}</span>
              </p>
              <p>
                <span className="text-stone-500">Interval:</span> every {s.fetchIntervalMinutes} min
                {s.minIntervalMinutes !== null && <span className="text-xs text-stone-500"> (min {s.minIntervalMinutes})</span>}
              </p>
              <p>
                <span className="text-stone-500">Last fetched:</span> {formatDate(s.lastFetchedAt, "en", true)}
              </p>
              <p>
                <span className="text-stone-500">Next run:</span> {s.isEnabled ? formatDate(s.nextRunAt, "en", true) : "—"}
              </p>
              <p>
                <span className="text-stone-500">Storage policy:</span> {s.integrationConfig.contentPolicy}
              </p>
              <p>
                <span className="text-stone-500">Items:</span>{" "}
                {Object.entries(s.itemCounts).map(([k, v]) => `${v} ${k}`).join(", ") || "none"}
              </p>
              <p>
                <span className="text-stone-500">Quality (last {s.quality?.recentJobs ?? 0} syncs):</span>{" "}
                {s.quality ? `${s.quality.failureRate}% failed, ${s.quality.duplicateRate}% duplicates` : "no data"}
              </p>
              <p>
                <span className="text-stone-500">Terms reviewed:</span>{" "}
                {s.accessReview?.termsReviewed ? `yes (${s.accessReview.reviewedBy ?? "—"})` : <strong className="text-amber-800">no</strong>}
                {s.accessReview?.termsUrl && (
                  <a href={s.accessReview.termsUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-emerald-800 underline">
                    terms ↗
                  </a>
                )}
              </p>
            </div>
            {s.accessReview?.notes && <p className="mt-2 text-xs text-stone-500">{s.accessReview.notes}</p>}
            {s.lastError && (
              <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800">
                Last error ({s.consecutiveFailures} consecutive): {s.lastError}
              </p>
            )}
            <div className="mt-2 flex gap-3 text-xs">
              <Link href={`/admin/web-data/jobs?sourceId=${s._id}`} className="text-emerald-800 underline">
                Sync history
              </Link>
              <Link href={`/admin/web-data/review?sourceId=${s._id}`} className="text-emerald-800 underline">
                Imported items
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
