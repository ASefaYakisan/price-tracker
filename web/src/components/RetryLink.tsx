"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { useUser } from "@/lib/auth";

// "Try again" for a link the signed-in visitor added and the scraper gave up on.
export function RetryLink({ productId }: { productId: number }) {
  const { t, apiError } = useI18n();
  const router = useRouter();
  const user = useUser();
  const [canRetry, setCanRetry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/track/${productId}/retry`)
      .then((r) => r.json())
      .then((json) => !cancelled && setCanRetry(Boolean(json?.canRetry)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, productId]);

  if (done) return <p className="mt-2 text-muted">{t.linkStatus.retried}</p>;
  if (!user || !canRetry) return null;

  async function retry() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/track/${productId}/retry`, { method: "POST" }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.ok) {
      setDone(true);
      router.refresh();
    } else {
      setError(apiError(json?.error));
    }
    setBusy(false);
  }

  return (
    <div className="mt-3">
      <button
        onClick={retry}
        disabled={busy}
        className="rounded-lg border border-line bg-card px-3 py-1.5 font-medium text-ink hover:bg-hover disabled:opacity-60"
      >
        {busy ? t.linkStatus.retrying : t.linkStatus.retry}
      </button>
      {error && <p className="mt-2 text-bad">{error}</p>}
    </div>
  );
}
