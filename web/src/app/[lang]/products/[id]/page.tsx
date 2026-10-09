import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BellIcon } from "@/components/BellIcon";
import { AlertForm } from "@/components/AlertForm";
import { PriceChart } from "@/components/PriceChart";
import { ChangeBadge, StockPill } from "@/components/ChangeBadge";
import { SourceChip } from "@/components/SourceChip";
import { Stat } from "@/components/Stat";
import { StopTracking } from "@/components/StopTracking";
import { fill } from "@/i18n/config";
import { BackLink } from "@/components/BackLink";
import { getDictionary, resolveLang } from "@/i18n/server";
import { getPriceHistory, getProduct } from "@/lib/data";
import { changeTone, dateTime, money, percent, percentChange } from "@/lib/format";

export default function ProductPage({ params }: PageProps<"/[lang]/products/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <BackLink />
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-card" />}>
        <ProductDetail params={params} />
      </Suspense>
    </main>
  );
}

async function ProductDetail({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [product, history] = await Promise.all([getProduct(id), getPriceHistory(id)]);
  if (!product) notFound();

  const prices = history.map((p) => p.price).filter((p): p is number => p != null);
  const first = prices[0] ?? null;
  const periodChange = percentChange(product.price, first);
  const cur = product.currency;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <SourceChip source={product.source} t={t} />
            <StockPill inStock={product.in_stock} t={t} />
            {product.scraped_at && <span>{fill(t.product.updated, { date: dateTime(product.scraped_at, lang) })}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href="#alert"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink shadow-soft hover:opacity-90"
          >
            <BellIcon /> {t.product.setAlert}
          </a>
          <a
            href={product.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink hover:bg-hover"
          >
            {t.product.viewSource} <span aria-hidden>↗</span>
          </a>
        </div>
      </div>

      <section className="my-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-card p-4 shadow-soft">
          <div className="text-sm text-muted">{t.product.current}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{money(product.price, cur, lang)}</div>
          <div className="mt-1">
            <ChangeBadge price={product.price} previous={product.previous_price} currency={cur} source={product.source} t={t} lang={lang} />
          </div>
        </div>
        <Stat label={t.product.lowest} value={prices.length ? money(Math.min(...prices), cur, lang) : "–"} hint={t.product.inPeriod} />
        <Stat label={t.product.highest} value={prices.length ? money(Math.max(...prices), cur, lang) : "–"} hint={t.product.inPeriod} />
        <Stat
          label={t.product.periodChange}
          value={periodChange == null ? "–" : percent(periodChange, lang)}
          hint={first == null ? undefined : fill(t.product.from, { price: money(first, cur, lang) })}
          tone={periodChange == null || Math.abs(periodChange) < 0.05 ? undefined : changeTone(periodChange, product.source)}
        />
      </section>

      <section className="rounded-2xl border border-line bg-card p-4 shadow-soft sm:p-6">
        <h2 className="mb-4 font-medium">{t.product.history}</h2>
        <PriceChart points={history} currency={cur} />
      </section>

      <section id="alert" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-card p-4 shadow-soft sm:p-6">
        <h2 className="flex items-center gap-2 font-medium">
          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent" aria-hidden>
            <BellIcon />
          </span>
          {t.product.alertTitle}
        </h2>
        <p className="mt-2 mb-4 text-sm text-muted">{t.product.alertText}</p>
        <AlertForm productId={product.id} title={product.title} price={product.price} currency={cur} />
      </section>

      {product.source === "custom" && <StopTracking productId={product.id} />}
    </>
  );
}
