import { getProducts, isDemo, type ProductRow } from "@/lib/data";

const money = (value: number | null, currency: string | null) =>
  value == null
    ? "–"
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: currency ?? "USD" }).format(value);

export default async function Home() {
  const products = await getProducts();
  const drops = products.filter((p) => (p.price_change ?? 0) < 0);
  const outOfStock = products.filter((p) => p.in_stock === false).length;
  const lastRun = products.map((p) => p.scraped_at).filter(Boolean).sort().at(-1);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Price Tracker</h1>
        <p className="text-sm text-zinc-500">
          Last scrape: {lastRun ? new Date(lastRun).toLocaleString("en-GB") : "never"}
          {isDemo && " · demo data (connect Supabase to see live prices)"}
        </p>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Tracked products" value={products.length} />
        <Stat label="Price drops since last run" value={drops.length} />
        <Stat label="Out of stock" value={outOfStock} />
      </section>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">Change</th>
              <th className="px-4 py-2 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <Row key={p.id} product={p} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ product: p }: { product: ProductRow }) {
  const change = p.price_change ?? 0;
  const tone = change < 0 ? "text-green-700" : change > 0 ? "text-red-700" : "text-zinc-400";
  return (
    <tr className="border-t border-zinc-100">
      <td className="px-4 py-2">
        <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">
          {p.title}
        </a>
        <div className="text-xs text-zinc-400">{p.source}</div>
      </td>
      <td className="px-4 py-2 text-right tabular-nums">{money(p.price, p.currency)}</td>
      <td className={`px-4 py-2 text-right tabular-nums ${tone}`}>
        {change === 0 ? "–" : `${change > 0 ? "+" : "−"}${money(Math.abs(change), p.currency)}`}
      </td>
      <td className="px-4 py-2">{p.in_stock === false ? "Out of stock" : "In stock"}</td>
    </tr>
  );
}
