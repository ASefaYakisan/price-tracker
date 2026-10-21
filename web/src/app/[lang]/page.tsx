import { getProducts, getSparklines, isDemo } from "@/lib/data";
import { dateTime, percentChange } from "@/lib/format";
import { ProductTable } from "@/components/ProductTable";
import { TrackForm } from "@/components/TrackForm";
import { fill } from "@/i18n/config";
import { getDictionary, resolveLang } from "@/i18n/server";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const lang = await resolveLang(params);
  const [t, products] = await Promise.all([getDictionary(lang), getProducts()]);
  const sparklines = await getSparklines(products.map((p) => p.id));
  const changes = products.map((p) => percentChange(p.price, p.previous_price)).filter((c): c is number => c != null);
  const drops = changes.filter((c) => c < 0).length;
  const rises = changes.filter((c) => c > 0).length;
  const outOfStock = products.filter((p) => p.in_stock === false).length;
  const lastRun = products
    .map((p) => p.scraped_at)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12">
      <section className="max-w-3xl py-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">{t.home.heroTitle}</h1>
        <p className="mt-2 mb-5 max-w-2xl text-base text-pretty text-muted sm:mt-3 sm:mb-6 sm:text-lg">{t.home.heroLead}</p>
        <TrackForm />
        <ol className="mt-5 hidden flex-wrap gap-x-6 gap-y-2 text-sm text-ink sm:flex">
          {[t.home.step1, t.home.step2, t.home.step3].map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent tabular-nums" aria-hidden>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {isDemo && (
        <p className="mb-6 border-s-2 border-warn ps-3 text-sm text-muted">{t.home.demo}</p>
      )}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t border-line pt-6">
        <div>
          <h2 className="text-lg font-semibold">{t.home.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {fill(t.home.summary, { items: products.length, sources: new Set(products.map((p) => p.source)).size })} ·{" "}
            {lastRun ? fill(t.home.lastScrape, { date: dateTime(lastRun, lang) }) : t.home.noScrapes}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <Figure label={t.home.priceDrops} value={drops} tone="text-ink" />
          <Figure label={t.home.priceRises} value={rises} tone="text-ink" />
          <Figure label={t.home.outOfStock} value={outOfStock} tone={outOfStock ? "text-warn" : "text-ink"} />
          <div className="hidden items-baseline gap-2 sm:flex">
            <dt className="text-muted">{t.home.download}</dt>
            <dd className="flex gap-3 font-medium">
              <a href={`/api/export?format=xlsx&lang=${lang}`} className="text-accent underline-offset-4 hover:underline">
                Excel
              </a>
              <a href={`/api/export?format=csv&lang=${lang}`} className="text-accent underline-offset-4 hover:underline">
                CSV
              </a>
            </dd>
          </div>
        </dl>
      </div>

      <ProductTable products={products} sparklines={sparklines} />
    </main>
  );
}

// One plain figure in the summary line: no cards, no icons.
function Figure({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
