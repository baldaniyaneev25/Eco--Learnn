"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor";
}

const StaffContext = createContext<StaffUser | null>(null);

export function useStaff(): StaffUser {
  const user = useContext(StaffContext);
  if (!user) throw new Error("useStaff outside AdminShell");
  return user;
}

const NAV = [
  { href: "/admin", label: "Overview" },
  { section: "Study content" },
  { href: "/admin/study", label: "Chapters & notes" },
  { href: "/admin/study/quizzes", label: "Quizzes & tests" },
  { section: "Web Data Manager" },
  { href: "/admin/web-data", label: "Data sources" },
  { href: "/admin/web-data/review", label: "Review queue" },
  { href: "/admin/web-data/jobs", label: "Sync jobs" },
  { href: "/admin/web-data/indicators", label: "Economic indicators" },
  { href: "/admin/web-data/audit", label: "Audit log" },
] as const;

function AdminShellInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checked, setChecked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    api<{ user: (StaffUser & { role: string }) | null }>("/api/auth/me")
      .then(({ user }) => {
        if (!user || (user.role !== "admin" && user.role !== "editor")) {
          router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setUser(user as StaffUser);
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setChecked(true));
    // Only check once per mount of the panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  if (!checked || !user) return <p className="p-8 text-center text-stone-500">Checking access…</p>;

  return (
    <StaffContext value={user}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-stone-200 bg-stone-900 text-stone-100 md:w-60 md:border-b-0 md:border-r">
          <div className="px-4 py-4">
            <Link href="/admin" className="text-lg font-bold">
              EcoLearn Admin
            </Link>
            <p className="mt-1 text-xs text-stone-400">
              {user.name} · {user.role}
            </p>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:block md:space-y-0.5">
            {NAV.map((n, i) =>
              "section" in n ? (
                <p key={i} className="hidden px-2 pt-3 text-xs uppercase tracking-wide text-stone-400 md:block">
                  {n.section}
                </p>
              ) : (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`block whitespace-nowrap rounded px-2 py-1.5 text-sm ${pathname === n.href ? "bg-stone-700 text-white" : "text-stone-300 hover:bg-stone-800"}`}
                >
                  {n.label}
                </Link>
              ),
            )}
          </nav>
          <div className="hidden px-4 pb-4 md:block">
            <Link href="/" className="block text-xs text-stone-400 underline">
              Open student app
            </Link>
            <button type="button" onClick={logout} className="mt-2 text-xs text-stone-400 underline">
              Sign out
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 bg-stone-50 p-4 md:p-6">{children}</main>
      </div>
    </StaffContext>
  );
}

// The shell reads the URL (active link, login redirect), so it renders behind Suspense.
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-stone-500">Checking access…</p>}>
      <AdminShellInner>{children}</AdminShellInner>
    </Suspense>
  );
}
