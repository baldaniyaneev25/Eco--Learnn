"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useLoader } from "@/lib/client/use-loader";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-emerald-700 text-white hover:bg-emerald-800",
    secondary: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
    danger: "bg-red-700 text-white hover:bg-red-800",
    ghost: "text-emerald-800 hover:underline",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`rounded px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

const BADGE_TONES = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-300",
  red: "bg-red-50 text-red-800 ring-red-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  gray: "bg-stone-100 text-stone-700 ring-stone-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ring-1 ${BADGE_TONES[tone]}`}>{children}</span>;
}

export const STATUS_TONE: Record<string, keyof typeof BADGE_TONES> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  archived: "gray",
  queued: "blue",
  running: "blue",
  succeeded: "green",
  partial: "amber",
  failed: "red",
  skipped: "gray",
  fresh: "green",
  stale: "amber",
  never: "gray",
  draft: "amber",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "gray"}>{status}</Badge>;
}

export function Card({ title, actions, children }: { title?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {title && <h2 className="mr-auto text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export const inputClass = "w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm";

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
}

export function Notice({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</div>;
}

export { useLoader as useAsync };

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} / {totalPages}
      </span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}
