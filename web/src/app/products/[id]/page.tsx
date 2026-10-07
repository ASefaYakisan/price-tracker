import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceChart } from "@/components/PriceChart";
import { getPriceHistory, getProduct } from "@/lib/data";

export default function ProductPage({ params }: PageProps<"/products/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← All products
      </Link>
      <Suspense fallback={<p className="mt-6 text-sm text-zinc-500">Loading…</p>}>
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
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: product.currency ?? "USD" }).format(v);

  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold">{product.title}</h1>
      <p className="text-sm text-zinc-500">
        {product.source} ·{" "}
        <a href={product.url} target="_blank" rel="noreferrer" className="hover:underline">
          View on site
        </a>
      </p>

      <section className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Current" value={product.price == null ? "–" : fmt(product.price)} />
        <Stat label="Lowest" value={prices.length ? fmt(Math.min(...prices)) : "–"} />
        <Stat label="Highest" value={prices.length ? fmt(Math.max(...prices)) : "–"} />
      </section>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-zinc-600">Price history</h2>
        <PriceChart points={history} currency={product.currency} />
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
