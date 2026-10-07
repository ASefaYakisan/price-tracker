import { getProducts, isDemo } from "@/lib/data";
import { dateTime, percentChange } from "@/lib/format";
import { ProductTable } from "@/components/ProductTable";
import { Stat } from "@/components/Stat";

export default async function Home() {
  const products = await getProducts();
  const changes = products.map((p) => percentChange(p.price, p.previous_price)).filter((c): c is number => c != null);
  const drops = changes.filter((c) => c < 0).length;
  const rises = changes.filter((c) => c > 0).length;
  const avg = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
  const outOfStock = products.filter((p) => p.in_stock === false).length;
  const lastRun = products.map((p) => p.scraped_at).filter((d): d is string => !!d).sort().at(-1);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted">
            {lastRun ? `Last scrape ${dateTime(lastRun)}` : "No scrapes yet"} · {products.length} products tracked
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/export?format=xlsx"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink hover:opacity-90"
          >
            <DownloadIcon /> Excel
          </a>
          <a
            href="/api/export?format=csv"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink hover:bg-hover"
          >
            <DownloadIcon /> CSV
          </a>
        </div>
      </div>

      {isDemo && (
        <p className="mb-6 rounded-lg border border-line bg-accent-soft px-4 py-3 text-sm text-ink">
          You are viewing demo data. Connect Supabase and run the scraper to track live prices.
        </p>
      )}

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tracked products" value={products.length} hint={`Average change ${avg > 0 ? "+" : ""}${avg.toFixed(1)}%`} />
        <Stat label="Price drops" value={drops} hint="since the last scrape" tone={drops ? "good" : undefined} />
        <Stat label="Price rises" value={rises} hint="since the last scrape" tone={rises ? "bad" : undefined} />
        <Stat
          label="Out of stock"
          value={outOfStock}
          hint="right now"
          tone={outOfStock ? "warn" : undefined}
        />
      </section>

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
