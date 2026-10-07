import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceChart } from "@/components/PriceChart";
import { ChangeBadge, StockPill } from "@/components/ChangeBadge";
import { Stat } from "@/components/Stat";
import { getPriceHistory, getProduct } from "@/lib/data";
import { dateTime, money, percentChange, sourceLabel } from "@/lib/format";

export default function ProductPage({ params }: PageProps<"/products/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <span aria-hidden>←</span> All items
      </Link>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-xl bg-card" />}>
        <ProductDetail params={params} />
      </Suspense>
    </main>
  );
}

async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [product, history] = await Promise.all([getProduct(id), getPriceHistory(id)]);
  if (!product) notFound();

  const prices = history.map((p) => p.price).filter((p): p is number => p != null);
  const first = prices[0] ?? null;
  const periodChange = percentChange(product.price, first);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>{sourceLabel(product.source)}</span>
            <StockPill inStock={product.in_stock} />
            {product.scraped_at && <span>Updated {dateTime(product.scraped_at)}</span>}
          </div>
        </div>
        <a
          href={product.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink hover:bg-hover"
        >
          View source <span aria-hidden>↗</span>
        </a>
      </div>

      <section className="my-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="text-sm text-muted">Current price</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{money(product.price, product.currency)}</div>
          <div className="mt-1">
            <ChangeBadge price={product.price} previous={product.previous_price} currency={product.currency} />
          </div>
        </div>
        <Stat label="Lowest" value={prices.length ? money(Math.min(...prices), product.currency) : "–"} hint="in this period" />
        <Stat label="Highest" value={prices.length ? money(Math.max(...prices), product.currency) : "–"} hint="in this period" />
        <Stat
          label="Period change"
          value={periodChange == null ? "–" : `${periodChange > 0 ? "+" : ""}${periodChange.toFixed(1)}%`}
          hint={first == null ? undefined : `from ${money(first, product.currency)}`}
          tone={periodChange == null || Math.abs(periodChange) < 0.05 ? undefined : periodChange < 0 ? "good" : "bad"}
        />
      </section>

      <section className="rounded-xl border border-line bg-card p-4 sm:p-6">
        <h2 className="mb-4 font-medium">Price history</h2>
        <PriceChart points={history} currency={product.currency} />
      </section>
    </>
  );
}
