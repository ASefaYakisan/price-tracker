"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export function AuthForm() {
  const router = useRouter();
  const confirmFailed = useSearchParams().get("error") === "confirm";
  const user = useUser();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    confirmFailed ? "That confirmation link is invalid or has expired. Try signing in." : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in (or just signed in): go to the alerts.
  useEffect(() => {
    if (user) router.replace("/alerts");
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/alerts` },
      });
      if (error) setError(error.message);
      // With email confirmation on there is no session yet: the user has to click the link first.
      else if (!data.session) setNotice(`We sent a confirmation link to ${email}. Open it to finish creating your account.`);
    }
    setBusy(false);
  }

  const input =
    "h-11 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none";
  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError(null);
        setNotice(null);
      }}
      className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === m ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );

  return (
    <section className="rounded-xl border border-line bg-card p-6 sm:p-8">
      <div className="flex gap-1 rounded-lg bg-bg p-1">
        {tab("sign-in", "Sign in")}
        {tab("sign-up", "Create account")}
      </div>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Password
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
          {mode === "sign-up" && <span className="text-xs text-faint">At least 6 characters.</span>}
        </label>
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        {notice && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-ink">{notice}</p>}
        <button
          disabled={busy}
          className="h-11 rounded-lg bg-accent text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-faint">
        An account keeps your price alerts on every device. You can still set alerts without one,{" "}
        <Link href="/" className="text-accent hover:underline">
          from any item
        </Link>
        .
      </p>
    </section>
  );
}
