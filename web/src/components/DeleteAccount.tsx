"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearAccountAlerts } from "@/lib/account-alerts";
import { useUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/client";

// Danger zone on the profile page. The user types their own email address to confirm deletion.
export function DeleteAccount() {
  const user = useUser();
  const router = useRouter();
  const { t, fill, href } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const email = user?.email ?? "";
  const matches = email !== "" && typed.trim().toLowerCase() === email.toLowerCase();

  function cancel() {
    setConfirming(false);
    setTyped("");
    setFailed(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!matches || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: typed }),
      });
      if (!res.ok) throw new Error(String(res.status));
      await createClient().auth.signOut({ scope: "local" }).catch(() => {});
      clearAccountAlerts();
      router.push(href("/"));
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="danger-title" className="rounded-xl border border-bad/40 p-5">
      <h2 id="danger-title" className="text-base font-semibold text-bad">
        {t.nav.profileDanger}
      </h2>
      {!confirming ? (
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm text-muted">{t.nav.profileDangerText}</p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-lg border border-bad px-3 py-2 text-sm font-medium text-bad hover:bg-bad-soft"
          >
            {t.nav.deleteAccount}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-4 text-sm">
          <p className="text-muted">{t.nav.deleteBody}</p>
          <label className="block space-y-1.5">
            <span className="block text-ink">{fill(t.nav.deleteConfirm, { email })}</span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              type="email"
              autoComplete="off"
              autoFocus
              className="w-full max-w-md rounded-lg border border-line bg-card px-3 py-2 text-ink"
            />
          </label>
          {failed && (
            <p role="alert" className="text-bad">
              {t.nav.deleteFailed}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!matches || busy}
              className="rounded-lg bg-bad px-3 py-2 font-medium text-white disabled:opacity-50"
            >
              {busy ? t.nav.deleteWorking : t.nav.deleteSubmit}
            </button>
            <button type="button" onClick={cancel} className="rounded-lg px-3 py-2 text-ink hover:bg-hover">
              {t.nav.deleteCancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
