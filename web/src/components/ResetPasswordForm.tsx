"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { useUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

// The reset link signs the user in through /auth/callback, then lands here to pick a new password.
export function ResetPasswordForm() {
  const router = useRouter();
  const user = useUser();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repeat) return setError("The two passwords do not match.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
    } else router.replace("/alerts");
  }

  const input =
    "h-11 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none";

  if (user === undefined) return <div className="h-80 animate-pulse rounded-xl border border-line bg-card" />;

  return (
    <section className="rounded-xl border border-line bg-card p-6 sm:p-8">
      <h1 className="text-lg font-semibold">Choose a new password</h1>
      {user ? (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <p className="text-sm text-muted">For {user.email}</p>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            New password
            <PasswordInput
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Repeat it
            <PasswordInput
              required
              minLength={6}
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              className={input}
            />
          </label>
          {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
          <button
            disabled={busy}
            className="h-11 rounded-lg bg-accent text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : "Save password"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted">
          This reset link has expired or was opened in another browser.{" "}
          <Link href="/login?mode=forgot" className="text-accent hover:underline">
            Send a new one
          </Link>
        </p>
      )}
    </section>
  );
}
