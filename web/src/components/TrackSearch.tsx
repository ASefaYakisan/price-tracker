"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { money, storeName } from "@/lib/format";
import { setInMyProducts, useMyProducts } from "@/lib/my-products";
import type { ProductRow } from "@/lib/data";
import { ProductThumb } from "@/components/ProductThumb";

type Found = Pick<ProductRow, "id" | "source" | "title" | "url" | "image_url" | "currency" | "price">;

// The box takes a name as well as a link: a name is looked up among the products this site already tracks.
export function TrackSearch({ query }: { query: string }) {
  const { t, lang, href, apiError } = useI18n();
  const { user, ids } = useMyProducts();
  const [result, setResult] = useState<{ query: string; items: Found[] } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=5`, { signal: controller.signal }).catch(() => null);
      const json = await res?.json().catch(() => null);
      if (res?.ok && Array.isArray(json?.items)) setResult({ query, items: json.items });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function add(id: number) {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/track/${id}`, { method: "POST" }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.ok) setInMyProducts(id, true);
    else setError(apiError(json?.error));
    setBusy(null);
  }

  // Results of an older query are not shown for a newer one.
  if (result?.query !== query) return null;
  if (!result.items.length) return <p className="mt-3 text-sm text-muted">{t.track.noMatch}</p>;

  return (
    <div className="mt-3 rounded-xl border border-line bg-card p-3 shadow-soft">
      <p className="mb-2 text-xs font-medium text-muted">{t.track.matches}</p>
      <ul className="divide-y divide-line">
        {result.items.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <ProductThumb product={p} />
            <Link href={href(`/products/${p.id}`)} className="min-w-0 flex-1 text-sm hover:underline">
              <span className="block truncate font-medium text-ink">{p.title}</span>
              <span className="block truncate text-xs text-muted">
                {storeName(p, t)} · {money(p.price, p.currency, lang)}
              </span>
            </Link>
            {user && ids && (
              <button
                type="button"
                onClick={() => add(p.id)}
                disabled={ids.has(p.id) || busy === p.id}
                className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-sm font-medium text-accent hover:bg-accent-soft disabled:text-muted disabled:opacity-70 disabled:hover:bg-transparent"
              >
                {ids.has(p.id) ? t.product.inYourList : busy === p.id ? t.product.adding : t.product.addToList}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
