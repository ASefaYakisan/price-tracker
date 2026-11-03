"use client";

import { useState } from "react";
import { NewPasswordField } from "@/components/NewPasswordField";
import { PasswordInput } from "@/components/PasswordInput";
import { useUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { isStrong } from "@/lib/password";
import { useI18n } from "@/i18n/client";

const input = "h-11 rounded-lg border form-field bg-bg px-3 text-sm text-ink placeholder:text-faint";

// Change password (asks for the current one first) and sign out of every other device.
export function ProfileSecurity() {
  const { t } = useI18n();
  const user = useUser();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [others, setOthers] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !user?.email) return;
    if (!isStrong(next)) return setMsg({ ok: false, text: t.auth.rules });
    if (next === current) return setMsg({ ok: false, text: t.nav.passwordSame });
    setBusy(true);
    setMsg(null);
    const auth = createClient().auth;
    // Prove it is really the owner: a stolen open session alone cannot change the password.
    const check = await auth.signInWithPassword({ email: user.email, password: current });
    if (check.error) {
      setBusy(false);
      return setMsg({ ok: false, text: t.nav.passwordWrongCurrent });
    }
    const { error } = await auth.updateUser({ password: next });
    if (error) {
      setBusy(false);
      return setMsg({ ok: false, text: t.nav.passwordFailed });
    }
    await auth.signOut({ scope: "others" }).catch(() => {});
    setCurrent("");
    setNext("");
    setBusy(false);
    setMsg({ ok: true, text: t.nav.passwordChanged });
  }

  async function signOutOthers() {
    const { error } = await createClient().auth.signOut({ scope: "others" });
    setOthers(error ? t.common.genericError : t.nav.signedOutOthers);
  }

  return (
    <section aria-labelledby="security-title" className="space-y-5 rounded-xl border border-line bg-card p-5 text-sm">
      <div>
        <h2 id="security-title" className="text-base font-semibold text-ink">
          {t.nav.changePassword}
        </h2>
        <p className="mt-1 text-muted">{t.nav.changePasswordText}</p>
      </div>
      <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-muted">
          {t.nav.currentPassword}
          <PasswordInput required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
        </label>
        <NewPasswordField label={t.nav.newPasswordLabel} value={next} onChange={setNext} className={input} />
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-good" : "text-bad"}>
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !current || !next}
          className="h-11 self-start rounded-lg bg-accent px-4 font-medium text-accent-ink hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t.common.pleaseWait : t.nav.passwordSave}
        </button>
      </form>
      <div className="border-t border-line pt-5">
        <h3 className="font-medium text-ink">{t.nav.signOutOthers}</h3>
        <p className="mt-1 text-muted">{t.nav.signOutOthersText}</p>
        <button type="button" onClick={signOutOthers} className="mt-3 rounded-lg border border-line px-3 py-2 font-medium text-ink hover:bg-hover">
          {t.nav.signOutOthers}
        </button>
        {others && (
          <p role="status" className="mt-2 text-muted">
            {others}
          </p>
        )}
      </div>
    </section>
  );
}
