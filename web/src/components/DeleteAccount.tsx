"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearAccountAlerts } from "@/lib/account-alerts";
import { useUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/client";

// Confirmation dialog for deleting the signed-in account. The user types their own email address to confirm.
export function DeleteAccount({ onClose }: { onClose: () => void }) {
  const user = useUser();
  const router = useRouter();
  const { t, fill, href } = useI18n();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const email = user?.email ?? "";
  const matches = email !== "" && typed.trim().toLowerCase() === email.toLowerCase();

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
      onClose();
      router.push(href("/"));
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-line bg-card p-5 text-sm shadow-lg">
        <h2 id="delete-account-title" className="text-base font-semibold text-ink">
          {t.nav.deleteTitle}
        </h2>
        <p className="text-muted">{t.nav.deleteBody}</p>
        <label className="block space-y-1.5">
          <span className="text-ink">{fill(t.nav.deleteConfirm, { email })}</span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            type="email"
            autoComplete="off"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink"
          />
        </label>
        {failed && (
          <p role="alert" className="text-bad">
            {t.nav.deleteFailed}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-ink hover:bg-hover">
            {t.nav.deleteCancel}
          </button>
          <button
            type="submit"
            disabled={!matches || busy}
            className="rounded-lg bg-bad px-3 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? t.nav.deleteWorking : t.nav.deleteSubmit}
          </button>
        </div>
      </form>
    </div>
  );
}
