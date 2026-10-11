"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import { Button, ErrorBox, Field, inputClass } from "./ui";

function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get("next") ?? "/admin";
  // Only allow internal admin paths as redirect targets.
  return /^\/admin(\/[\w\-/]*)?$/.test(next) && next !== "/admin/login" ? next : "/admin";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: { role: string } }>("/api/auth/login", { method: "POST", json: { email, password } });
      if (user.role !== "admin" && user.role !== "editor") {
        await api("/api/auth/logout", { method: "POST" });
        throw new Error("This account does not have staff access");
      }
      router.replace(safeNext());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">EcoLearn staff login</h1>
        <ErrorBox error={error} />
        <Field label="Email">
          <input className={inputClass} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
