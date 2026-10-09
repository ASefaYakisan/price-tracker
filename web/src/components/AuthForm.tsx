"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { useUser } from "@/lib/auth";
import { authEnabled, createClient } from "@/lib/supabase/client";
import { createRecoveryClient } from "@/lib/supabase/recovery";

type Mode = "sign-in" | "sign-up" | "forgot";

const ERRORS: Record<string, string> = {
  confirm: "That link is invalid or has expired. Try again.",
  google: "Google sign-in did not finish. Try again.",
};

// Show the Google button only once the provider is switched on in Supabase.
function useGoogleEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (!authEnabled) return;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: key ? { apikey: key } : {} })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setEnabled(Boolean(s?.external?.google)))
      .catch(() => {});
  }, []);
  return enabled;
}

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useUser();
  const google = useGoogleEnabled();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "forgot" ? "forgot" : "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(ERRORS[params.get("error") ?? ""] ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in (or just signed in): go to the alerts.
  useEffect(() => {
    if (user) router.replace("/alerts");
  }, [user, router]);

  function switchTo(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
  }

  const callback = (next: string) => `${location.origin}/auth/callback?next=${next}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
    } else if (mode === "sign-up") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback("/alerts") } });
      if (error) setError(error.message);
      // With email confirmation on there is no session yet: the user has to click the link first.
      else if (!data.session) setNotice(`We sent a confirmation link to ${email}. Open it to finish creating your account.`);
    } else {
      const { error } = await createRecoveryClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
      if (error) setError(error.message);
      else setNotice(`If ${email} has an account, a reset link is on its way.`);
    }
    setBusy(false);
  }

  async function signInWithGoogle() {
    setBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback("/alerts") } });
    if (error) {
      setError(ERRORS.google);
      setBusy(false);
    }
  }

  const input =
    "h-11 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none";
  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => switchTo(m)}
      className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === m ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );

  return (
    <section className="p-6 sm:p-10">
      {mode === "forgot" ? (
        <div>
          <h2 className="text-lg font-semibold">Reset your password</h2>
          <p className="mt-1 text-sm text-muted">Enter your email and we will send you a link to choose a new password.</p>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold">{mode === "sign-in" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1 text-sm text-muted">
            {mode === "sign-in" ? "Sign in to see your price alerts." : "Free. Keeps your price alerts on every device."}
          </p>
          <div className="mt-5 flex gap-1 rounded-lg bg-bg p-1">
            {tab("sign-in", "Sign in")}
            {tab("sign-up", "Create account")}
          </div>
          {google && (
            <>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={busy}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-card text-sm font-medium text-ink hover:bg-hover disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2.1H12v4h6c-.1 1-.8 2.6-2.3 3.6v3h3.7c2.1-2 3.2-4.9 3.2-8.5z" />
                  <path
                    fill="#34A853"
                    d="M12 23c3 0 5.6-1 7.4-2.7l-3.7-3c-1 .7-2.3 1.2-3.7 1.2-2.9 0-5.3-1.9-6.2-4.5H2v3C3.8 20.6 7.6 23 12 23z"
                  />
                  <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7H2c-.8 1.5-1.2 3.2-1.2 5s.4 3.5 1.2 5l3.8-3z" />
                  <path
                    fill="#EA4335"
                    d="M12 5.4c1.7 0 2.8.7 3.5 1.3l2.6-2.5C16.5 2.7 14.5 1.8 12 1.8 7.6 1.8 3.8 4.3 2 7.9l3.8 3c.9-2.7 3.3-4.5 6.2-4.5z"
                  />
                </svg>
                Continue with Google
              </button>
              <div className="mt-5 flex items-center gap-3 text-xs text-faint">
                <span className="h-px flex-1 bg-line" />
                or with email
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}
        </>
      )}
      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        {mode !== "forgot" && (
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Password
            <PasswordInput
              required
              minLength={6}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
            {mode === "sign-up" && <span className="text-xs text-faint">At least 6 characters.</span>}
          </label>
        )}
        {mode === "sign-in" && (
          <button type="button" onClick={() => switchTo("forgot")} className="-mt-2 self-end text-xs text-accent hover:underline">
            Forgot password?
          </button>
        )}
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        {notice && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-ink">{notice}</p>}
        <button
          disabled={busy}
          className="h-11 rounded-lg bg-accent text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
        </button>
      </form>
      {mode === "forgot" ? (
        <button type="button" onClick={() => switchTo("sign-in")} className="mt-6 w-full text-center text-sm text-accent hover:underline">
          Back to sign in
        </button>
      ) : (
        <p className="mt-6 text-center text-xs text-faint">
          No account needed to set an alert.{" "}
          <Link href="/" className="text-accent hover:underline">
            Browse items
          </Link>
        </p>
      )}
    </section>
  );
}
