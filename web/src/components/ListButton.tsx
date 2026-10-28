"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { setInMyProducts, useMyProducts } from "@/lib/my-products";

// "Add to my list" / "Remove from my list" on the product page, for signed-in visitors.
// Removing only touches this visitor's list; other people keep the item, its history and their alerts.
export function ListButton({ productId }: { productId: number }) {
  const { t, apiError } = useI18n();
  const { user, ids } = useMyProducts();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !ids) return null;
  const inList = ids.has(productId);

  async function change(add: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/track/${productId}`, { method: add ? "POST" : "DELETE" }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.ok) {
      setInMyProducts(productId, add);
      setConfirm(false);
    } else setError(apiError(json?.error));
    setBusy(false);
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted">{confirm ? t.product.removeConfirm : inList ? t.product.inYourList : t.product.notInList}</span>
        <div className="flex gap-2">
          {confirm && (
            <button onClick={() => setConfirm(false)} className="rounded-lg border border-line px-3 py-1.5 text-muted hover:text-ink">
              {t.common.cancel}
            </button>
          )}
          {inList ? (
            <button
              onClick={() => (confirm ? change(false) : setConfirm(true))}
              disabled={busy}
              className={`rounded-lg px-3 py-1.5 font-medium disabled:opacity-60 ${confirm ? "bg-bad text-white hover:opacity-90" : "border border-line text-bad hover:bg-bad-soft"}`}
            >
              {busy ? t.product.removing : t.product.removeFromList}
            </button>
          ) : (
            <button
              onClick={() => change(true)}
              disabled={busy}
              className="rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
            >
              {busy ? t.product.adding : t.product.addToList}
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </section>
  );
}
