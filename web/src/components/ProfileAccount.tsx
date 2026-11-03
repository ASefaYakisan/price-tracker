"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { usedPercent, type AccountSummary } from "@/lib/account-summary";
import { useI18n } from "@/i18n/client";

const input = "h-11 w-full rounded-lg border form-field bg-bg px-3 text-sm text-ink placeholder:text-faint";

type Msg = { ok: boolean; text: string } | null;

function Say({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-good" : "text-bad"}>
      {msg.text}
    </p>
  );
}

// Display name and e-mail address (Supabase sends a confirmation to the new address), plus sign-out everywhere.
export function ProfileAccount() {
  const { t } = useI18n();
  const user = useUser();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<Msg>(null);
  const [emailMsg, setEmailMsg] = useState<Msg>(null);
  const [allMsg, setAllMsg] = useState<string | null>(null);

  const shownName = name ?? (typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "");

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNameMsg(null);
    const { error } = await createClient().auth.updateUser({ data: { display_name: shownName.trim().slice(0, 60) } });
    setBusy(false);
    setNameMsg(error ? { ok: false, text: t.common.genericError } : { ok: true, text: t.nav.nameSaved });
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    const next = email.trim();
    if (busy || !next) return;
    if (next.toLowerCase() === user?.email?.toLowerCase()) return setEmailMsg({ ok: false, text: t.nav.emailSame });
    setBusy(true);
    setEmailMsg(null);
    const { error } = await createClient().auth.updateUser({ email: next });
    setBusy(false);
    if (error) return setEmailMsg({ ok: false, text: t.nav.emailFailed });
    setEmail("");
    setEmailMsg({ ok: true, text: t.nav.emailCheck });
  }

  async function signOutAll() {
    const { error } = await createClient().auth.signOut({ scope: "global" });
    if (error) return setAllMsg(t.common.genericError);
    window.location.reload();
  }

  return (
    <section aria-labelledby="account-title" className="space-y-5 rounded-xl border border-line bg-card p-5 text-sm">
      <h2 id="account-title" className="text-base font-semibold text-ink">
        {t.nav.profileAccount}
      </h2>
      <form onSubmit={saveName} className="flex max-w-md flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-muted">
          {t.nav.displayName}
          <input value={shownName} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="nickname" className={input} />
        </label>
        <Say msg={nameMsg} />
        <button type="submit" disabled={busy} className="h-11 self-start rounded-lg border border-line px-4 font-medium text-ink hover:bg-hover disabled:opacity-50">
          {t.nav.nameSave}
        </button>
      </form>
      <form onSubmit={saveEmail} className="flex max-w-md flex-col gap-3 border-t border-line pt-5">
        <label className="flex flex-col gap-1.5 text-muted">
          {t.nav.newEmail}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={input} />
        </label>
        <p className="text-muted">{t.nav.emailText}</p>
        <Say msg={emailMsg} />
        <button type="submit" disabled={busy || !email} className="h-11 self-start rounded-lg border border-line px-4 font-medium text-ink hover:bg-hover disabled:opacity-50">
          {t.nav.emailSave}
        </button>
      </form>
      <div className="border-t border-line pt-5">
        <h3 className="font-medium text-ink">{t.nav.signOutAll}</h3>
        <p className="mt-1 text-muted">{t.nav.signOutAllText}</p>
        <button type="button" onClick={signOutAll} className="mt-3 rounded-lg border border-line px-3 py-2 font-medium text-ink hover:bg-hover">
          {t.nav.signOutAll}
        </button>
        {allMsg && (
          <p role="alert" className="mt-2 text-bad">
            {allMsg}
          </p>
        )}
      </div>
    </section>
  );
}

function Meter({ label, u }: { label: string; u: { used: number; max: number } }) {
  const pct = usedPercent(u);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums text-ink">
          {u.used} / {u.max}
        </span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={u.max} aria-valuenow={u.used} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hover">
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-bad" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Account summary: what the account tracks and how much of each limit is used.
export function ProfileSummary() {
  const { t } = useI18n();
  const [s, setS] = useState<AccountSummary | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/account/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && j?.ok && setS(j.summary))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!s) return null;
  return (
    <section aria-labelledby="summary-title" className="space-y-4 rounded-xl border border-line bg-card p-5 text-sm">
      <h2 id="summary-title" className="text-base font-semibold text-ink">
        {t.nav.summaryTitle}
      </h2>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-muted">{t.nav.summaryListed}</dt>
          <dd className="text-xl font-semibold tabular-nums text-ink">{s.listed}</dd>
        </div>
        <div>
          <dt className="text-muted">{t.nav.summaryAlertsActive}</dt>
          <dd className="text-xl font-semibold tabular-nums text-ink">{s.alertsActive}</dd>
        </div>
        <div>
          <dt className="text-muted">{t.nav.summaryAlertsTotal}</dt>
          <dd className="text-xl font-semibold tabular-nums text-ink">{s.alertsTotal}</dd>
        </div>
      </dl>
      <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
        <Meter label={t.nav.quotaLinks} u={s.links} />
        <Meter label={t.nav.quotaLinksHour} u={s.linksHour} />
        <Meter label={t.nav.quotaAlerts} u={s.alerts} />
      </div>
    </section>
  );
}
