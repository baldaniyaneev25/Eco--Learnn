"use client";

import { BOARDS, CLASS_LEVELS } from "@/config/categories";
import { Field, inputClass } from "../ui";

export type Bi = { en: string; gu: string };
export const emptyBi = (): Bi => ({ en: "", gu: "" });
export const biLabel = (v?: Partial<Bi> | null) => v?.en || v?.gu || "(untitled)";

/** English + Gujarati inputs side by side. */
export function BilingualField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  hint,
}: {
  label: string;
  value: Bi;
  onChange: (v: Bi) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}) {
  const input = (lang: "en" | "gu") =>
    multiline ? (
      <textarea lang={lang} rows={rows} className={inputClass} value={value[lang]} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} />
    ) : (
      <input lang={lang} className={inputClass} value={value[lang]} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} />
    );
  return (
    <fieldset className="text-sm">
      <legend className="mb-1 font-medium text-stone-700">{label}</legend>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="block">
          <span className="text-xs text-stone-500">English</span>
          {input("en")}
        </label>
        <label className="block">
          <span className="text-xs text-stone-500">ગુજરાતી</span>
          {input("gu")}
        </label>
      </div>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </fieldset>
  );
}

export function ClassSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <Field label="Class">
      <select className={inputClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {CLASS_LEVELS.map((c) => (
          <option key={c} value={c}>
            Class {c}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function BoardChecks({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="text-sm">
      <legend className="mb-1 font-medium text-stone-700">Boards (none ticked = all boards)</legend>
      <div className="flex gap-4">
        {BOARDS.map((b) => (
          <label key={b} className="flex items-center gap-1">
            <input type="checkbox" checked={value.includes(b)} onChange={() => onChange(value.includes(b) ? value.filter((x) => x !== b) : [...value, b])} />
            {b}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PublishToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>Published</strong> — visible to students in the app
      </span>
    </label>
  );
}

/** Formats zod field errors from the API into one readable line. */
export function describeError(err: unknown): string {
  const e = err as Error & { details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } };
  const fields = e.details?.fieldErrors ? Object.entries(e.details.fieldErrors).map(([k, v]) => `${k}: ${v.join(", ")}`) : [];
  const form = e.details?.formErrors ?? [];
  return [e.message, ...form, ...fields].filter(Boolean).join(" — ");
}
