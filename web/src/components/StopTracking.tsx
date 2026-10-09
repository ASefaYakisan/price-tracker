"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { useUser } from "@/lib/auth";

// "Stop tracking" for a link the signed-in visitor added themselves.
export function StopTracking({ productId }: { productId: number }) {
  const { t, href, apiError } = useI18n();
  const router = useRouter();
  const user = useUser();
  const [canRemove, setCanRemove] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/track/${productId}`)
      .then((r) => r.json())
      .then((json) => !cancelled && setCanRemove(Boolean(json?.canRemove)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, productId]);

  if (!user || !canRemove) return null;

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/track/${productId}`, { method: "DELETE" }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.ok) {
      router.push(href("/"));
      router.refresh();
    } else {
      setError(apiError(json?.error));
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted">{confirm ? t.product.stopConfirm : t.product.addedByYou}</span>
        <div className="flex gap-2">
          {confirm && (
            <button onClick={() => setConfirm(false)} className="rounded-lg border border-line px-3 py-1.5 text-muted hover:text-ink">
              {t.common.cancel}
            </button>
          )}
          <button
            onClick={() => (confirm ? remove() : setConfirm(true))}
            disabled={busy}
            className={`rounded-lg px-3 py-1.5 font-medium disabled:opacity-60 ${confirm ? "bg-bad text-white hover:opacity-90" : "border border-line text-bad hover:bg-bad-soft"}`}
          >
            {busy ? t.product.removing : t.product.stopTracking}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </section>
  );
}
