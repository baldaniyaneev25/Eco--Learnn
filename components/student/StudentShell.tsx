"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BOARDS, CLASS_LEVELS } from "@/config/categories";
import { t } from "@/lib/client/i18n";
import { PreferencesProvider, usePrefs } from "./preferences";

const NAV = [
  { href: "/", key: "home" },
  { href: "/news", key: "news" },
  { href: "/current-affairs", key: "currentAffairs" },
  { href: "/economy", key: "economy" },
  { href: "/resources", key: "resources" },
] as const;

function NavLinks({ withActive }: { withActive: boolean }) {
  const { lang } = usePrefs();
  return (
    <ul className="flex gap-1 text-sm">
      {NAV.map((n) => (
        <li key={n.href}>{withActive ? <ActiveLink href={n.href} label={t(n.key, lang)} /> : <PlainLink href={n.href} label={t(n.key, lang)} active={false} />}</li>
      ))}
    </ul>
  );
}

function PlainLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block whitespace-nowrap border-b-2 px-3 py-2 ${active ? "border-emerald-700 font-semibold text-emerald-800" : "border-transparent text-stone-600 hover:text-emerald-800"}`}
    >
      {label}
    </Link>
  );
}

function ActiveLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <PlainLink href={href} label={label} active={active} />;
}

function Header() {
  const { lang, board, classLevel, update } = usePrefs();
  return (
    <header className="border-b border-emerald-900/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="mr-auto text-xl font-bold text-emerald-800">
          {t("appName", lang)}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <span className="text-stone-600">{t("board", lang)}</span>
            <select className="rounded border border-stone-300 bg-white px-2 py-1" value={board} onChange={(e) => update({ board: e.target.value })}>
              {BOARDS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-stone-600">{t("class", lang)}</span>
            <select className="rounded border border-stone-300 bg-white px-2 py-1" value={classLevel} onChange={(e) => update({ classLevel: e.target.value })}>
              {CLASS_LEVELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <div role="group" aria-label={t("language", lang)} className="flex overflow-hidden rounded border border-emerald-700">
            {(["gu", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => update({ lang: l })}
                aria-pressed={lang === l}
                className={`px-3 py-1 ${lang === l ? "bg-emerald-700 text-white" : "bg-white text-emerald-800"}`}
              >
                {l === "gu" ? "ગુજરાતી" : "English"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
        {/* The active-link highlight depends on the URL, so it streams in behind Suspense. */}
        <Suspense fallback={<NavLinks withActive={false} />}>
          <NavLinks withActive />
        </Suspense>
      </nav>
    </header>
  );
}

function Footer() {
  const { lang } = usePrefs();
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-stone-500">
        <p>{t("sampleNotice", lang)}</p>
        <Link href="/admin" className="underline">
          {t("adminLink", lang)}
        </Link>
      </div>
    </footer>
  );
}

export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </PreferencesProvider>
  );
}
