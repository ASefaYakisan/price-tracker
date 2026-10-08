"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductRow } from "@/lib/data";
import { money, percentChange, sourceLabel } from "@/lib/format";
import { ChangeBadge, StockPill } from "@/components/ChangeBadge";
import { BellIcon } from "@/components/BellIcon";
import { useVisibleAlerts } from "@/lib/account-alerts";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "drops", label: "Price drops" },
  { key: "rises", label: "Price rises" },
  { key: "out", label: "Out of stock" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const SORTS = {
  drop: { label: "Biggest drop", fn: (a: ProductRow, b: ProductRow) => pct(a) - pct(b) },
  low: { label: "Price: low to high", fn: (a: ProductRow, b: ProductRow) => (a.price ?? 0) - (b.price ?? 0) },
  high: { label: "Price: high to low", fn: (a: ProductRow, b: ProductRow) => (b.price ?? 0) - (a.price ?? 0) },
  name: { label: "Name", fn: (a: ProductRow, b: ProductRow) => a.title.localeCompare(b.title) },
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
    <section className="rounded-xl border border-line bg-card">
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search products</span>
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-faint"
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
            placeholder="Search…"
            className="h-9 w-full rounded-lg border border-line bg-bg pr-3 pl-9 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </label>
        {sources.length > 1 && (
          <label className="relative shrink-0">
            <span className="sr-only">Source</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-line bg-bg pr-8 pl-3 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="all">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {sourceLabel(s)}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute top-2.5 right-2.5 size-4 text-faint"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </label>
        )}
        <div className="flex flex-wrap gap-1 rounded-lg bg-bg p-1" role="group" aria-label="Filter">
          {FILTERS.map((f) => {
            const count = inSource.filter((p) => matches(p, f.key)).length;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {f.label} <span className="text-faint tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
          <span className="whitespace-nowrap">Sort by</span>
          <span className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 appearance-none rounded-lg border border-line bg-bg pr-8 pl-3 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {Object.entries(SORTS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute top-2.5 right-2.5 size-4 text-faint"
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
        <p className="p-10 text-center text-sm text-muted">Nothing matches these filters.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((p) => (
            <li
              key={p.id}
              onClick={() => router.push(`/products/${p.id}`)}
              className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-hover"
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- small remote thumbnails, no optimisation needed
                <img src={p.image_url} alt="" loading="lazy" className="h-12 w-9 shrink-0 rounded object-cover" />
              ) : (
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-sm font-semibold text-accent"
                  aria-hidden
                >
                  {p.title.replace(/^(the|a|an)\s+/i, "").slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/products/${p.id}`} className="block truncate font-medium text-ink hover:text-accent">
                  {p.title}
                </Link>
                <div className="mt-0.5 flex items-center gap-3">
                  <span className="truncate text-xs text-faint">{sourceLabel(p.source)}</span>
                  <StockPill inStock={p.in_stock} />
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums">{money(p.price, p.currency)}</div>
                <div className="mt-0.5">
                  <ChangeBadge price={p.price} previous={p.previous_price} currency={p.currency} source={p.source} />
                </div>
              </div>
              <Link
                href={`/products/${p.id}#alert`}
                onClick={(e) => e.stopPropagation()}
                className={`grid size-9 shrink-0 place-items-center rounded-lg border border-line hover:bg-hover ${
                  alertIds.has(p.id) ? "text-accent" : "text-muted hover:text-ink"
                }`}
                title={alertIds.has(p.id) ? "You have an alert on this item" : "Set a price alert"}
                aria-label={`${alertIds.has(p.id) ? "Edit" : "Set"} price alert for ${p.title}`}
              >
                <BellIcon filled={alertIds.has(p.id)} />
              </Link>
              <svg
                viewBox="0 0 20 20"
                className="hidden size-4 text-faint sm:block"
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
