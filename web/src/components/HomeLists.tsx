"use client";

import { useState } from "react";
import type { ProductRow } from "@/lib/data";
import { dateTime } from "@/lib/format";
import { changeCounts } from "@/lib/change-counts";
import { defaultList, itemsInList, LISTS, type ListKey } from "@/lib/lists";
import { useMyProducts } from "@/lib/my-products";
import { useI18n } from "@/i18n/client";
import type { Dict } from "@/i18n/dictionaries/en";
import { ProductTable } from "@/components/ProductTable";

const TAB_LABEL: Record<ListKey, (t: Dict) => string> = {
  mine: (t) => t.home.tabMine,
  explore: (t) => t.home.tabExplore,
  markets: (t) => t.home.tabMarkets,
  sample: (t) => t.home.tabSample,
};

// The lists under the link box: your own items, what everyone added, market feeds and the sample books.
export function HomeLists({ products, sparklines }: { products: ProductRow[]; sparklines: Record<number, number[]> }) {
  const { t, lang, fill } = useI18n();
  const { user, ids: mine } = useMyProducts();
  const [picked, setPicked] = useState<ListKey | null>(null);
  const tabs = LISTS.filter((l) => l !== "mine" || user);
  const fallback = defaultList(Boolean(user), itemsInList(products, "explore", null).length);
  const list = picked && tabs.includes(picked) ? picked : fallback;
  const items = itemsInList(products, list, mine);

  const { drops, rises } = changeCounts(items);
  const outOfStock = items.filter((p) => p.in_stock === false).length;
  const lastRun = items
    .map((p) => p.scraped_at)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return (
    <>
      <div className="-mb-px flex gap-5 overflow-x-auto border-t border-line pt-4 text-sm" role="tablist" aria-label={t.home.listsLabel}>
        {tabs.map((l) => {
          const active = l === list;
          return (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPicked(l)}
              className={`shrink-0 border-b-2 pb-2 font-semibold whitespace-nowrap transition-colors ${
                active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {TAB_LABEL[l](t)}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t border-line pt-4">
        <p className="text-sm text-muted">
          {fill(t.home.summary, { items: items.length, sources: new Set(items.map((p) => p.source)).size })} ·{" "}
          {lastRun ? fill(t.home.lastScrape, { date: dateTime(lastRun, lang) }) : t.home.noScrapes}
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {drops + rises === 0 ? (
            <div>
              <dd className="text-muted">{t.home.noChanges}</dd>
            </div>
          ) : (
            <>
              <Figure label={t.home.priceDrops} value={drops} tone="text-ink" hint={t.home.sinceLastScrape} />
              <Figure label={t.home.priceRises} value={rises} tone="text-ink" hint={t.home.sinceLastScrape} />
            </>
          )}
          <Figure label={t.home.outOfStock} value={outOfStock} tone={outOfStock ? "text-warn" : "text-ink"} />
          {items.length > 0 && (
            <div className="hidden items-baseline gap-2 sm:flex">
              <dt className="text-muted">{t.home.download}</dt>
              <dd className="flex gap-3 font-medium">
                <a href={`/api/export?format=xlsx&lang=${lang}&list=${list}`} className="text-accent underline-offset-4 hover:underline">
                  Excel
                </a>
                <a href={`/api/export?format=csv&lang=${lang}&list=${list}`} className="text-accent underline-offset-4 hover:underline">
                  CSV
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {list === "sample" && <p className="mb-4 text-sm text-muted">{t.home.sampleNote}</p>}

      {list === "mine" && !mine ? (
        <div className="h-40 animate-pulse rounded-lg bg-card" />
      ) : list === "mine" && items.length === 0 ? (
        <EmptyList title={t.home.mineEmptyTitle} text={t.home.mineEmptyText} cta={t.home.mineEmptyCta} />
      ) : list === "explore" && items.length === 0 ? (
        <EmptyList title={t.home.exploreEmptyTitle} text={t.home.exploreEmptyText} cta={t.home.mineEmptyCta} />
      ) : (
        <ProductTable key={list} products={items} sparklines={sparklines} />
      )}
    </>
  );
}

// Sends people back to the link box at the top of the page.
function EmptyList({ title, text, cta }: { title: string; text: string; cta: string }) {
  function focusLinkBox() {
    const box = document.getElementById("track-url");
    box?.scrollIntoView({ behavior: "smooth", block: "center" });
    box?.focus({ preventScroll: true });
  }
  return (
    <div className="border-y border-line py-12 text-center">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-pretty text-muted">{text}</p>
      <button
        type="button"
        onClick={focusLinkBox}
        className="mt-4 h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:opacity-90"
      >
        {cta}
      </button>
    </div>
  );
}

// One plain figure in the summary line: no cards, no icons.
function Figure({ label, value, tone, hint }: { label: string; value: number; tone: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-1.5" title={hint}>
      <dt className="text-muted">{label}</dt>
      <dd className={`font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
