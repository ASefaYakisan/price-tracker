import { getProducts, isDemo } from "@/lib/data";
import { dateTime, percent, percentChange } from "@/lib/format";
import { ProductTable } from "@/components/ProductTable";
import { Stat } from "@/components/Stat";
import { TrackForm } from "@/components/TrackForm";
import { fill } from "@/i18n/config";
import { getDictionary, resolveLang } from "@/i18n/server";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const lang = await resolveLang(params);
  const [t, products] = await Promise.all([getDictionary(lang), getProducts()]);
  const changes = products.map((p) => percentChange(p.price, p.previous_price)).filter((c): c is number => c != null);
  const drops = changes.filter((c) => c < 0).length;
  const rises = changes.filter((c) => c > 0).length;
  const avg = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
  const outOfStock = products.filter((p) => p.in_stock === false).length;
  const lastRun = products
    .map((p) => p.scraped_at)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-gradient-to-br from-accent-soft via-card to-teal-soft p-6 shadow-soft sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.home.title}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {lastRun ? fill(t.home.lastScrape, { date: dateTime(lastRun, lang) }) : t.home.noScrapes} ·{" "}
            {fill(t.home.summary, { items: products.length, sources: new Set(products.map((p) => p.source)).size })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{t.home.download}</span>
          <a
            href={`/api/export?format=xlsx&lang=${lang}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink shadow-soft hover:opacity-90"
          >
            <DownloadIcon /> Excel
          </a>
          <a
            href={`/api/export?format=csv&lang=${lang}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink hover:bg-hover"
          >
            <DownloadIcon /> CSV
          </a>
        </div>
      </section>

      {isDemo && <p className="mb-6 rounded-xl border border-line bg-warn-soft px-4 py-3 text-sm text-ink">{t.home.demo}</p>}

      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label={t.home.trackedItems}
          value={products.length}
          hint={fill(t.home.averageChange, { value: percent(avg, lang) })}
          icon={<path d="M4 7h16M4 12h16M4 17h10" />}
        />
        <Stat
          label={t.home.priceDrops}
          value={drops}
          hint={t.home.sinceLastScrape}
          iconTone="good"
          icon={<path d="M4 7l6 6 4-4 6 6M20 10v5h-5" />}
        />
        <Stat
          label={t.home.priceRises}
          value={rises}
          hint={t.home.sinceLastScrape}
          iconTone="bad"
          icon={<path d="M4 17l6-6 4 4 6-6M20 14V9h-5" />}
        />
        <Stat
          label={t.home.outOfStock}
          value={outOfStock}
          hint={t.home.rightNow}
          tone={outOfStock ? "warn" : undefined}
          iconTone="warn"
          icon={<path d="M4 8l8-4 8 4v8l-8 4-8-4V8zM4 8l8 4 8-4M12 12v8" />}
        />
      </section>

      <TrackForm />

      <ProductTable products={products} />
    </main>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
