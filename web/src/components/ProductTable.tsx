"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductRow } from "@/lib/data";
import { money, percentChange, sourceLabel } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { Dict } from "@/i18n/dictionaries/en";
import { ChangeBadge, StockPill } from "@/components/ChangeBadge";
import { BellIcon } from "@/components/BellIcon";
import { useVisibleAlerts } from "@/lib/account-alerts";
import { Sparkline } from "@/components/Sparkline";

const FILTERS = ["all", "drops", "rises", "out"] as const;
type FilterKey = (typeof FILTERS)[number];

const SORTS = {
  drop: { label: (t: Dict) => t.table.sortDrop, fn: (a: ProductRow, b: ProductRow) => pct(a) - pct(b) },
  low: { label: (t: Dict) => t.table.sortLow, fn: (a: ProductRow, b: ProductRow) => (a.price ?? 0) - (b.price ?? 0) },
  high: { label: (t: Dict) => t.table.sortHigh, fn: (a: ProductRow, b: ProductRow) => (b.price ?? 0) - (a.price ?? 0) },
  name: { label: (t: Dict) => t.table.sortName, fn: (a: ProductRow, b: ProductRow) => a.title.localeCompare(b.title) },
};
type SortKey = keyof typeof SORTS;

const PAGE = 50; // rows shown at first and added by "Show more"

function pct(p: ProductRow) {
  return percentChange(p.price, p.previous_price) ?? 0;
}

function matches(p: ProductRow, filter: FilterKey) {
  if (filter === "drops") return pct(p) < 0;
  if (filter === "rises") return pct(p) > 0;
  if (filter === "out") return p.in_stock === false;
  return true;
}

export function ProductTable({ products, sparklines = {} }: { products: ProductRow[]; sparklines?: Record<number, number[]> }) {
  const router = useRouter();
  const { t, lang, href, fill } = useI18n();
  const myAlerts = useVisibleAlerts();
  const alertIds = new Set(myAlerts.map((a) => a.productId));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("drop");
  const [source, setSource] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const sources = useMemo(() => [...new Set(products.map((p) => p.source))].sort(), [products]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (source === "all" || p.source === source) && matches(p, filter) && (!q || p.title.toLowerCase().includes(q)))
      .sort(SORTS[sort].fn);
  }, [products, query, filter, sort, source]);
  const inSource = source === "all" ? products : products.filter((p) => p.source === source);

  return (
    <section>
      <div className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center">
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
            className="h-9 w-full rounded-lg border border-line bg-card ps-9 pe-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </label>
        <div className="flex gap-3">
          {sources.length > 1 && (
            <label className="relative min-w-0 flex-1 lg:flex-none">
              <span className="sr-only">{t.table.source}</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-line bg-card ps-3 pe-8 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="all">{t.table.allSources}</option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {sourceLabel(s, t)}
                  </option>
                ))}
              </select>
              <Chevron />
            </label>
          )}
          <label className="relative min-w-0 flex-1 lg:flex-none">
            <span className="sr-only">{t.table.sortBy}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 w-full appearance-none rounded-lg border border-line bg-card ps-3 pe-8 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {Object.entries(SORTS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label(t)}
                </option>
              ))}
            </select>
            <Chevron />
          </label>
        </div>
      </div>
      <div className="-mb-px flex gap-5 overflow-x-auto text-sm" role="group" aria-label={t.table.filter}>
        {FILTERS.map((f) => {
          const count = inSource.filter((p) => matches(p, f)).length;
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={`shrink-0 border-b-2 py-2 font-medium whitespace-nowrap transition-colors ${
                active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.table[f]} <span className="text-faint tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-line py-12 text-center text-sm text-muted">{t.table.empty}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.slice(0, shown).map((p) => (
            <li
              key={p.id}
              onClick={() => router.push(href(`/products/${p.id}`))}
              className="flex cursor-pointer items-center gap-3 py-3 transition-colors hover:bg-hover sm:gap-4 sm:px-2"
            >
              <Thumb product={p} />
              <div className="min-w-0 flex-1">
                <Link href={href(`/products/${p.id}`)} className="line-clamp-2 font-medium text-ink hover:text-accent sm:line-clamp-1">
                  {p.title}
                </Link>
                <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted">
                  <span className="truncate">{storeName(p, t)}</span>
                  <StockPill inStock={p.in_stock} t={t} />
                </div>
              </div>
              <Sparkline points={sparklines[p.id]} source={p.source} className="hidden md:block" />
              <div className="shrink-0 text-end">
                <div className="text-base font-semibold tabular-nums sm:text-lg">{money(p.price, p.currency, lang)}</div>
                <ChangeBadge price={p.price} previous={p.previous_price} currency={p.currency} source={p.source} t={t} lang={lang} />
              </div>
              <Link
                href={href(`/products/${p.id}#alert`)}
                onClick={(e) => e.stopPropagation()}
                className={`grid size-9 shrink-0 place-items-center rounded-full hover:bg-card ${
                  alertIds.has(p.id) ? "text-accent" : "text-faint hover:text-ink"
                }`}
                title={alertIds.has(p.id) ? t.table.hasAlert : t.table.setAlert}
                aria-label={fill(alertIds.has(p.id) ? t.table.editAlertFor : t.table.setAlertFor, { title: p.title })}
              >
                <BellIcon filled={alertIds.has(p.id)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {rows.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mx-auto mt-4 block h-9 rounded-lg border border-line bg-card px-4 text-sm font-medium text-ink hover:bg-hover"
        >
          {fill(t.table.showMore, { count: rows.length - shown })}
        </button>
      )}
    </section>
  );
}

// Shop products are named by their site; the built-in feeds by their source.
function storeName(p: ProductRow, t: Dict) {
  if (p.source !== "custom") return sourceLabel(p.source, t);
  try {
    return new URL(p.url).hostname.replace(/^www\./, "");
  } catch {
    return sourceLabel(p.source, t);
  }
}

// Product photo first; a shop's favicon when there is none; a small source icon as the last resort.
function Thumb({ product: p }: { product: ProductRow }) {
  const candidates = [p.image_url, p.source === "custom" ? favicon(p.url) : null].filter((u): u is string => !!u);
  const [failed, setFailed] = useState(0);
  const src = candidates[failed];
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-card text-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- small remote thumbnails, no optimisation needed
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed((n) => n + 1)}
          className={src === p.image_url ? "size-full object-contain" : "size-6"}
        />
      ) : (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {SOURCE_ICONS[p.source] ?? SOURCE_ICONS.custom}
        </svg>
      )}
    </span>
  );
}

function favicon(url: string) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
  } catch {
    return null;
  }
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  "books-toscrape": <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2zM12 6.5v13" />,
  coingecko: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M10 8.5h3a1.75 1.75 0 010 3.5h-3m0 0h3.5a1.75 1.75 0 010 3.5H10m0-7v7M11 7v1.5M11 15.5V17" />
    </>
  ),
  tcmb: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </>
  ),
  gold: <path d="M4 18h16l-2.5-7h-11zM8 11l1.5-4h5l1.5 4" />,
  custom: (
    <>
      <path d="M3.5 12.6V5a1.5 1.5 0 011.5-1.5h7.6a1.5 1.5 0 011 .4l7.4 7.4a1.5 1.5 0 010 2.1l-7.6 7.6a1.5 1.5 0 01-2.1 0l-7.4-7.4a1.5 1.5 0 01-.4-1z" />
      <circle cx="8" cy="8" r="1.3" />
    </>
  ),
};

function Chevron() {
  return (
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
  );
}
