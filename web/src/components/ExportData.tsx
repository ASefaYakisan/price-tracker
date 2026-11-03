"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";

// Downloads the account's own data (email, alerts, list) as a JSON file.
export function ExportData() {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: "price-tracker-my-data.json" });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="data-title" className="rounded-xl border border-line bg-card p-5 text-sm">
      <h2 id="data-title" className="text-base font-semibold text-ink">
        {t.nav.profileData}
      </h2>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-muted">{t.nav.exportText}</p>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="shrink-0 rounded-lg border border-line px-3 py-2 font-medium text-ink hover:bg-hover disabled:opacity-50"
        >
          {busy ? t.common.pleaseWait : t.nav.exportButton}
        </button>
      </div>
      {failed && (
        <p role="alert" className="mt-2 text-bad">
          {t.nav.exportFailed}
        </p>
      )}
    </section>
  );
}
