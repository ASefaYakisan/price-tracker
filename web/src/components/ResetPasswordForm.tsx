"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { createRecoveryClient } from "@/lib/supabase/recovery";

// The reset email links here with the one-time session in the URL hash (#access_token=…&type=recovery).
// That session is used once, in memory, to save the new password and is then signed out,
// so the tab where the user asked for the link stays on the sign-in page.
const noSubscribe = () => () => {};

export function ResetPasswordForm() {
  const hash = useSyncExternalStore(
    noSubscribe,
    () => location.hash,
    () => null,
  );
  const link = useMemo(() => {
    if (hash === null) return undefined;
    const p = new URLSearchParams(hash.slice(1));
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    return access_token && refresh_token && p.get("type") === "recovery" ? { access_token, refresh_token } : null;
  }, [hash]);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!link) return;
    if (password !== repeat) return setError("The two passwords do not match.");
    setBusy(true);
    setError(null);
    const auth = createRecoveryClient().auth;
    const session = await auth.setSession(link);
    const error = session.error ? "This reset link has expired. Ask for a new one." : (await auth.updateUser({ password })).error?.message;
    if (error) {
      setError(error);
      setBusy(false);
      return;
    }
    await auth.signOut({ scope: "local" });
    setDone(true);
    history.replaceState(null, "", location.pathname);
    // Works when the browser allows it; otherwise the message below says to close the tab.
    window.close();
  }

  const input =
    "h-11 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none";

  if (link === undefined && !done) return <div className="h-80 animate-pulse rounded-xl border border-line bg-card" />;

  return (
    <section className="rounded-xl border border-line bg-card p-6 sm:p-8">
      {done ? (
        <>
          <span className="grid size-11 place-items-center rounded-full bg-good-soft text-good" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h1 className="mt-4 text-lg font-semibold">Password changed</h1>
          <p className="mt-1 text-sm text-muted">You can close this tab and sign in with your new password.</p>
          <Link
            href="/login"
            className="mt-6 grid h-11 place-items-center rounded-lg bg-accent text-sm font-medium text-accent-ink hover:opacity-90"
          >
            Sign in
          </Link>
        </>
      ) : link ? (
        <>
          <h1 className="text-lg font-semibold">Choose a new password</h1>
          <p className="mt-1 text-sm text-muted">After saving, sign in with it.</p>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
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
              <span className="text-xs text-faint">At least 6 characters.</span>
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
        </>
      ) : (
        <>
          <h1 className="text-lg font-semibold">Link expired</h1>
          <p className="mt-1 text-sm text-muted">
            This reset link is invalid or has already been used.{" "}
            <Link href="/login?mode=forgot" className="text-accent hover:underline">
              Send a new one
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
