"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { NewPasswordField } from "@/components/NewPasswordField";
import { isStrong } from "@/lib/password";
import { createRecoveryClient } from "@/lib/supabase/recovery";
import { useI18n } from "@/i18n/client";

const noSubscribe = () => () => {};

// Other open tabs of the site listen here (the sign-in page goes back to "sign in" when the password changes).
export const PASSWORD_CHANNEL = "pt-password";

type Auth = ReturnType<typeof createRecoveryClient>["auth"];
type Target =
  | { link: { access_token: string; refresh_token: string } }
  | { email: string };

// The reset email's button links here as ?email=…; the page then asks for the code from the same email
// and only after that for the new password. Older emails linked here with the one-time session in the
// URL hash (#access_token=…&type=recovery); those still work. Either way the session lives in memory,
// is used once to save the new password and is then signed out, so other open tabs stay signed out.
export function ResetPasswordForm() {
  const { t, href } = useI18n();
  const url = useSyncExternalStore(
    noSubscribe,
    () => location.href,
    () => null,
  );
  const target = useMemo((): Target | null | undefined => {
    if (url === null) return undefined;
    const { hash, searchParams } = new URL(url);
    const p = new URLSearchParams(hash.slice(1));
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    if (access_token && refresh_token && p.get("type") === "recovery")
      return { link: { access_token, refresh_token } };
    // "+" in an address arrives as a space when the email app does not encode it.
    const email = searchParams.get("email")?.trim().replace(/ /g, "+");
    return email ? { email } : null;
  }, [url]);
  const link = target && "link" in target ? target.link : null;
  const [verified, setVerified] = useState<Auth | null>(null);
  const [done, setDone] = useState(false);

  async function open() {
    if (verified) return verified;
    if (!link) return null;
    const auth = createRecoveryClient().auth;
    return (await auth.setSession(link)).error ? null : auth;
  }

  function finish() {
    setDone(true);
    if (typeof BroadcastChannel !== "undefined")
      new BroadcastChannel(PASSWORD_CHANNEL).postMessage("changed");
    history.replaceState(null, "", location.pathname);
    // Works when the browser allows it; otherwise the message below says to close the tab.
    window.close();
  }

  if (target === undefined && !done)
    return (
      <div className="h-80 animate-pulse rounded-xl border border-line bg-card" />
    );

  return (
    <section className="rounded-2xl border border-line bg-card p-6 shadow-soft sm:p-8">
      {done ? (
        <>
          <span
            className="grid size-11 place-items-center rounded-full bg-good-soft text-good"
            aria-hidden
          >
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
          <h1 className="mt-4 text-lg font-semibold">{t.reset.doneTitle}</h1>
          <p className="mt-1 text-sm text-muted">{t.reset.doneText}</p>
          <Link
            href={href("/login")}
            className="mt-6 grid h-11 place-items-center rounded-lg bg-accent text-sm font-medium text-accent-ink hover:opacity-90"
          >
            {t.auth.signIn}
          </Link>
        </>
      ) : target && "email" in target && !verified ? (
        <>
          <h1 className="text-lg font-semibold">{t.reset.codeTitle}</h1>
          <p className="mt-1 text-sm text-muted">{t.reset.codeText}</p>
          <CodeStep email={target.email} onVerified={setVerified} />
        </>
      ) : target ? (
        <>
          <h1 className="text-lg font-semibold">{t.reset.title}</h1>
          <p className="mt-1 text-sm text-muted">{t.reset.text}</p>
          <ChoosePassword open={open} onDone={finish} />
        </>
      ) : (
        <>
          <h1 className="text-lg font-semibold">{t.reset.invalidTitle}</h1>
          <p className="mt-1 text-sm text-muted">
            {t.reset.invalidText}{" "}
            <Link
              href={href("/login?mode=forgot")}
              className="text-accent hover:underline"
            >
              {t.reset.sendNew}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}

// New password + repeat. `open` returns the one-time recovery session (from the email link or the code),
// or null when it has expired. The session is signed out right after saving.
export function ChoosePassword({
  open,
  onDone,
}: {
  open: () => Promise<Auth | null>;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isStrong(password)) return setError(t.auth.weakPassword);
    if (password !== repeat) return setError(t.reset.mismatch);
    setBusy(true);
    setError(null);
    const auth = await open();
    const update = auth ? (await auth.updateUser({ password })).error : null;
    // Supabase refuses the current password as the new one ("same_password").
    const error = !auth
      ? t.reset.expired
      : update?.code === "same_password"
        ? t.auth.samePassword
        : update?.code === "weak_password"
          ? t.auth.weakPassword
          : update?.message;
    if (error || !auth) {
      setError(error ?? t.reset.expired);
      setBusy(false);
      return;
    }
    await auth.signOut({ scope: "local" });
    onDone();
  }

  const input =
    "h-11 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none";

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
      <NewPasswordField
        label={t.reset.newPassword}
        value={password}
        onChange={setPassword}
        className={input}
      />
      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t.reset.repeat}
        <PasswordInput
          required
          minLength={8}
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          className={input}
        />
      </label>
      {error && (
        <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="h-11 rounded-lg bg-accent text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
      >
        {busy ? t.common.pleaseWait : t.reset.save}
      </button>
    </form>
  );
}

// The one-time code from the reset email. A correct code opens a recovery session (in memory only).
export function CodeStep({
  email,
  onVerified,
  notice,
}: {
  email: string;
  onVerified: (auth: Auth) => void;
  notice?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const auth = createRecoveryClient().auth;
    const { error } = await auth.verifyOtp({
      email,
      token: code.replace(/\s/g, ""),
      type: "recovery",
    });
    setBusy(false);
    if (error) setError(t.auth.codeWrong);
    else onVerified(auth);
  }

  const input =
    "h-11 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none";

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
      {notice}
      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t.auth.codeLabel}
        <input
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,12}"
          maxLength={12}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${input} tracking-[0.3em]`}
        />
      </label>
      {error && (
        <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="h-11 rounded-lg bg-accent text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
      >
        {busy ? t.common.pleaseWait : t.auth.verifyCode}
      </button>
    </form>
  );
}
