import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";

export type ProductRow = {
  id: number;
  source: string;
  title: string;
  url: string;
  image_url: string | null;
  currency: string | null;
  price: number | null;
  previous_price: number | null;
  price_change: number | null;
  in_stock: boolean | null;
  scraped_at: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isDemo = !url || !anonKey;

export async function getProducts(): Promise<ProductRow[]> {
  "use cache";
  cacheLife("minutes");
  if (isDemo) return DEMO_PRODUCTS;
  const db = createClient(url!, anonKey!);
  const { data, error } = await db
    .from("product_latest")
    .select("id, source, title, url, image_url, currency, price, previous_price, price_change, in_stock, scraped_at")
    .order("price_change", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data as ProductRow[];
}

export type PricePoint = { scraped_at: string; price: number | null; in_stock: boolean };

export async function getProduct(id: number): Promise<ProductRow | null> {
  "use cache";
  cacheLife("minutes");
  if (isDemo) return DEMO_PRODUCTS.find((p) => p.id === id) ?? null;
  const db = createClient(url!, anonKey!);
  const { data, error } = await db.from("product_latest").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ProductRow | null;
}

export async function getPriceHistory(id: number, days = 90): Promise<PricePoint[]> {
  "use cache";
  cacheLife("minutes");
  if (isDemo) return demoHistory(id, days);
  const db = createClient(url!, anonKey!);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await db
    .from("price_history")
    .select("scraped_at, price, in_stock")
    .eq("product_id", id)
    .gte("scraped_at", since)
    .order("scraped_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as PricePoint[];
}

// Sample rows so the dashboard renders before Supabase is connected.
const now = new Date().toISOString();
const demo = (id: number, slug: string, title: string, price: number, previous: number, in_stock = true): ProductRow => ({
  id,
  source: "books-toscrape",
  title,
  url: `https://books.toscrape.com/catalogue/${slug}/index.html`,
  image_url: null,
  currency: "GBP",
  price,
  previous_price: previous,
  price_change: +(price - previous).toFixed(2),
  in_stock,
  scraped_at: now,
});
const DEMO_PRODUCTS: ProductRow[] = [
  demo(1, "a-light-in-the-attic_1000", "A Light in the Attic", 45.17, 51.77),
  demo(2, "tipping-the-velvet_999", "Tipping the Velvet", 53.74, 53.74, false),
  demo(3, "soumission_998", "Soumission", 46.1, 50.1),
  demo(4, "sharp-objects_997", "Sharp Objects", 49.99, 47.82),
  demo(5, "sapiens-a-brief-history-of-humankind_996", "Sapiens: A Brief History of Humankind", 54.23, 54.23),
  demo(6, "the-requiem-red_995", "The Requiem Red", 22.65, 22.65),
  demo(7, "the-dirty-little-secrets-of-getting-your-dream-job_994", "The Dirty Little Secrets of Getting Your Dream Job", 33.34, 35.02),
  demo(8, "the-coming-woman-a-novel-based-on-the-life-of-the-infamous-feminist-victoria-woodhull_993", "The Coming Woman", 17.93, 17.93, false),
];

// Deterministic daily series ending at the demo product's current price.
function demoHistory(id: number, days: number): PricePoint[] {
  const product = DEMO_PRODUCTS.find((p) => p.id === id);
  if (!product?.price) return [];
  const end = Date.parse(product.scraped_at!);
  let seed = id * 9301;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const points: PricePoint[] = [];
  let price = product.previous_price ?? product.price;
  for (let i = Math.min(days, 30) - 1; i >= 1; i--) {
    points.push({ scraped_at: new Date(end - i * 86_400_000).toISOString(), price: +price.toFixed(2), in_stock: true });
    if (rand() < 0.25) price = Math.max(1, price + (rand() - 0.5) * 6);
  }
  points[points.length - 1].price = product.previous_price;
  points.push({ scraped_at: product.scraped_at!, price: product.price, in_stock: product.in_stock ?? true });
  return points;
}
