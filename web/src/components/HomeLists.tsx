"use client";

import { useState, useSyncExternalStore } from "react";
import type { ProductRow } from "@/lib/data";
import { dateTime } from "@/lib/format";
import { changeCounts } from "@/lib/change-counts";
import { isStale } from "@/lib/health";
import { defaultList, itemsInList, LISTS, type ListKey } from "@/lib/lists";
import { useMyProducts } from "@/lib/my-products";
import { useI18n } from "@/i18n/client";
import type { Dict } from "@/i18n/dictionaries/en";
import { ProductTable } from "@/components/ProductTable";

const TAB_LABEL: Record<ListKey, (t: Dict) => string> = {
  mine: (t) => t.home.tabMine,
  markets: (t) => t.home.tabMarkets,
  sample: (t) => t.home.tabSample,
};

const LOADED_AT = Date.now();
const subscribeNever = () => () => {};

// The lists under the link box: your own items, market feeds and the sample books.
export function HomeLists({ products, sparklines }: { products: ProductRow[]; sparklines: Record<number, number[]> }) {
  const { t, lang, fill } = useI18n();
  const { user, ids: mine, items: mineItems, sparklines: mineSparklines } = useMyProducts();
  const [picked, setPicked] = useState<ListKey | null>(null);
  const now = useSyncExternalStore(subscribeNever, () => LOADED_AT, () => null); // the age note needs the browser clock
  const tabs = LISTS.filter((l) => l !== "mine" || user);
  const list = picked && tabs.includes(picked) ? picked : defaultList(Boolean(user));
  const items = itemsInList(products, list, mine ? mineItems : null);

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

      <dl className="my-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.home.trackedItems} value={items.length} note={fill(t.home.summary, { items: items.length, sources: new Set(items.map((p) => p.source)).size })} />
        <StatCard label={t.home.priceDrops} value={drops} tone={drops ? "text-good" : "text-ink"} note={t.home.sinceLastScrape} />
        <StatCard label={t.home.priceRises} value={rises} tone={rises ? "text-bad" : "text-ink"} note={t.home.sinceLastScrape} />
        <StatCard label={t.home.outOfStock} value={outOfStock} tone={outOfStock ? "text-warn" : "text-ink"} />
      </dl>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 text-sm text-muted">
        <p>
          {lastRun ? fill(t.home.lastScrape, { date: dateTime(lastRun, lang) }) : t.home.noScrapes}
          {now !== null && isStale(lastRun, now) && <span className="ml-2 text-warn">· {t.home.staleData}</span>}
        </p>
        {items.length > 0 && (
          <p className="hidden items-baseline gap-3 sm:flex">
            <span>{t.home.download}</span>
            <a href={`/api/export?format=xlsx&lang=${lang}&list=${list}`} className="font-medium text-accent underline-offset-4 hover:underline">
              Excel
            </a>
            <a href={`/api/export?format=csv&lang=${lang}&list=${list}`} className="font-medium text-accent underline-offset-4 hover:underline">
              CSV
            </a>
          </p>
        )}
      </div>

      {list === "sample" && <p className="mb-4 text-sm text-muted">{t.home.sampleNote}</p>}

      {list === "mine" && !mine ? (
        <div className="h-40 animate-pulse rounded-lg bg-card" />
      ) : list === "mine" && items.length === 0 ? (
        <EmptyList title={t.home.mineEmptyTitle} text={t.home.mineEmptyText} cta={t.home.mineEmptyCta} />
      ) : (
        <ProductTable key={list} products={items} sparklines={list === "mine" ? mineSparklines : sparklines} />
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

// One figure card in the summary row above the list.
function StatCard({ label, value, tone = "text-ink", note }: { label: string; value: number; tone?: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3 transition-colors hover:bg-hover">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</dd>
      {note && <p className="mt-0.5 truncate text-xs text-faint">{note}</p>}
    </div>
  );
}
