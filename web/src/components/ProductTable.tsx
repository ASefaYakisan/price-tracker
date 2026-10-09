"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductRow } from "@/lib/data";
import { money, percentChange, sourceLabel } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { Dict } from "@/i18n/dictionaries/en";
import { SourceChip, sourceTone } from "@/components/SourceChip";
import { ChangeBadge, StockPill } from "@/components/ChangeBadge";
import { BellIcon } from "@/components/BellIcon";
import { useVisibleAlerts } from "@/lib/account-alerts";

const FILTERS = ["all", "drops", "rises", "out"] as const;
type FilterKey = (typeof FILTERS)[number];

const SORTS = {
  drop: { label: (t: Dict) => t.table.sortDrop, fn: (a: ProductRow, b: ProductRow) => pct(a) - pct(b) },
  low: { label: (t: Dict) => t.table.sortLow, fn: (a: ProductRow, b: ProductRow) => (a.price ?? 0) - (b.price ?? 0) },
  high: { label: (t: Dict) => t.table.sortHigh, fn: (a: ProductRow, b: ProductRow) => (b.price ?? 0) - (a.price ?? 0) },
  name: { label: (t: Dict) => t.table.sortName, fn: (a: ProductRow, b: ProductRow) => a.title.localeCompare(b.title) },
};
type SortKey = keyof typeof SORTS;

function pct(p: ProductRow) {
  return percentChange(p.price, p.previous_price) ?? 0;
}

function matches(p: ProductRow, filter: FilterKey) {
  if (filter === "drops") return pct(p) < 0;
  if (filter === "rises") return pct(p) > 0;
  if (filter === "out") return p.in_stock === false;
  return true;
}

export function ProductTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const { t, lang, href, fill } = useI18n();
  const myAlerts = useVisibleAlerts();
  const alertIds = new Set(myAlerts.map((a) => a.productId));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("drop");
  const [source, setSource] = useState("all");
  const sources = useMemo(() => [...new Set(products.map((p) => p.source))].sort(), [products]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (source === "all" || p.source === source) && matches(p, filter) && (!q || p.title.toLowerCase().includes(q)))
      .sort(SORTS[sort].fn);
  }, [products, query, filter, sort, source]);
  const inSource = source === "all" ? products : products.filter((p) => p.source === source);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">{t.table.searchLabel}</span>
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute start-3 top-2.5 size-4 text-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.table.search}
            className="h-9 w-full rounded-lg border border-line bg-bg ps-9 pe-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </label>
        {sources.length > 1 && (
          <label className="relative shrink-0">
            <span className="sr-only">{t.table.source}</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-line bg-bg ps-3 pe-8 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="all">{t.table.allSources}</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {sourceLabel(s, t)}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute end-2.5 top-2.5 size-4 text-faint"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </label>
        )}
        <div className="flex flex-wrap gap-1 rounded-lg bg-bg p-1" role="group" aria-label={t.table.filter}>
          {FILTERS.map((f) => {
            const count = inSource.filter((p) => matches(p, f)).length;
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {t.table[f]} <span className="text-faint tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
          <span className="whitespace-nowrap">{t.table.sortBy}</span>
          <span className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 appearance-none rounded-lg border border-line bg-bg ps-3 pe-8 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {Object.entries(SORTS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label(t)}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute end-2.5 top-2.5 size-4 text-faint"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted">{t.table.empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((p) => (
            <li
              key={p.id}
              onClick={() => router.push(href(`/products/${p.id}`))}
              className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-hover"
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- small remote thumbnails, no optimisation needed
                <img src={p.image_url} alt="" loading="lazy" className="h-12 w-9 shrink-0 rounded object-cover" />
              ) : (
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold ${sourceTone(p.source)}`}
                  aria-hidden
                >
                  {p.title.replace(/^(the|a|an)\s+/i, "").slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Link href={href(`/products/${p.id}`)} className="block truncate font-medium text-ink hover:text-accent">
                  {p.title}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <SourceChip source={p.source} t={t} />
                  <StockPill inStock={p.in_stock} t={t} />
                </div>
              </div>
              <div className="text-end">
                <div className="font-semibold tabular-nums">{money(p.price, p.currency, lang)}</div>
                <div className="mt-0.5">
                  <ChangeBadge price={p.price} previous={p.previous_price} currency={p.currency} source={p.source} t={t} lang={lang} />
                </div>
              </div>
              <Link
                href={href(`/products/${p.id}#alert`)}
                onClick={(e) => e.stopPropagation()}
                className={`grid size-9 shrink-0 place-items-center rounded-lg border border-line hover:bg-hover ${
                  alertIds.has(p.id) ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
                }`}
                title={alertIds.has(p.id) ? t.table.hasAlert : t.table.setAlert}
                aria-label={fill(alertIds.has(p.id) ? t.table.editAlertFor : t.table.setAlertFor, { title: p.title })}
              >
                <BellIcon filled={alertIds.has(p.id)} />
              </Link>
              <svg
                viewBox="0 0 20 20"
                className="hidden size-4 text-faint sm:block rtl:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
