import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BellIcon } from "@/components/BellIcon";
import { AlertForm } from "@/components/AlertForm";
import { PriceChart } from "@/components/PriceChart";
import { ChangeBadge, StockPill } from "@/components/ChangeBadge";
import { LinkStatusNote, LinkStatusPill } from "@/components/LinkStatus";
import { ProductThumb } from "@/components/ProductThumb";
import { fill } from "@/i18n/config";
import { BackLink } from "@/components/BackLink";
import { ListButton } from "@/components/ListButton";
import { getDictionary, resolveLang } from "@/i18n/server";
import { getPriceHistory, getProduct } from "@/lib/data";
import { changeTone, dateTime, money, percent, percentChange, storeName } from "@/lib/format";

// Tab, bookmark and link-preview title: the product's own name and price. getProduct is
// "use cache"d, so this shares the page's fetch.
export async function generateMetadata({ params }: PageProps<"/[lang]/products/[id]">): Promise<Metadata> {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  const id = Number((await params).id);
  const product = Number.isInteger(id) ? await getProduct(id) : null;
  if (!product) return { title: t.meta.title, robots: { index: false } };

  const title = `${product.title} · ${t.meta.title}`;
  const description =
    product.price == null
      ? `${storeName(product, t)} · ${t.meta.description}`
      : `${fill(t.meta.productPrice, { price: money(product.price, product.currency, lang) })} · ${storeName(product, t)}`;
  return {
    title,
    description,
    openGraph: { title, description, ...(product.image_url ? { images: [product.image_url] } : {}) },
  };
}

export default function ProductPage({ params }: PageProps<"/[lang]/products/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <BackLink />
      <Suspense fallback={<div className="mt-5 h-96 animate-pulse rounded-xl bg-hover" />}>
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

  const figures = [
    prices.length ? { label: t.product.lowest, value: money(Math.min(...prices), cur, lang) } : null,
    prices.length ? { label: t.product.highest, value: money(Math.max(...prices), cur, lang) } : null,
    periodChange == null
      ? null
      : {
          label: t.product.periodChange,
          value: percent(periodChange, lang),
          hint: first == null ? undefined : fill(t.product.from, { price: money(first, cur, lang) }),
          tone: Math.abs(periodChange) < 0.05 ? "text-ink" : changeTone(periodChange, product.source) === "good" ? "text-good" : "text-bad",
        },
  ].filter((f) => f != null);

  return (
    <>
      <header className="mt-5 flex gap-4 sm:gap-6">
        <ProductThumb product={product} large />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="truncate font-medium">{storeName(product, t)}</span>
            <StockPill inStock={product.in_stock} t={t} />
            <LinkStatusPill product={product} t={t} />
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-balance sm:text-3xl">{product.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="sr-only">{t.product.current}</span>
            <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{money(product.price, cur, lang)}</span>
            <ChangeBadge price={product.price} previous={product.previous_price} currency={cur} source={product.source} t={t} lang={lang} />
          </div>
          {product.scraped_at && (
            <p className="mt-1 text-xs text-faint">{fill(t.product.updated, { date: dateTime(product.scraped_at, lang) })}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="#alert"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink hover:opacity-90"
            >
              <BellIcon /> {t.product.setAlert}
            </a>
            <a
              href={product.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-ink hover:bg-hover"
            >
              {t.product.viewSource} <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </header>

      <LinkStatusNote product={product} t={t} lang={lang} />

      {figures.length > 0 && (
        <dl className="mt-8 flex divide-x divide-line border-y border-line rtl:divide-x-reverse">
          {figures.map((f) => (
            <div key={f.label} className="min-w-0 flex-1 px-3 py-3 first:ps-0 sm:px-5">
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className={`mt-0.5 text-base font-semibold tabular-nums sm:text-lg ${"tone" in f ? f.tone : "text-ink"}`}>{f.value}</dd>
              {"hint" in f && f.hint && <dd className="text-xs text-faint">{f.hint}</dd>}
            </div>
          ))}
        </dl>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">{t.product.history}</h2>
        <PriceChart points={history} currency={cur} />
      </section>

      <section id="alert" className="mt-10 scroll-mt-20 border-t border-line pt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BellIcon className="size-5 text-accent" />
          {t.product.alertTitle}
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">{t.product.alertText}</p>
        <AlertForm productId={product.id} title={product.title} price={product.price} currency={cur} />
      </section>

      <ListButton productId={product.id} />
    </>
  );
}
