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

// Sample rows so the dashboard renders before Supabase is connected.
const now = new Date().toISOString();
const demo = (id: number, title: string, price: number, previous: number, in_stock = true): ProductRow => ({
  id,
  source: "books-toscrape",
  title,
  url: "https://books.toscrape.com/",
  image_url: null,
  currency: "GBP",
  price,
  previous_price: previous,
  price_change: +(price - previous).toFixed(2),
  in_stock,
  scraped_at: now,
});
const DEMO_PRODUCTS: ProductRow[] = [
  demo(1, "A Light in the Attic", 45.17, 51.77),
  demo(2, "Tipping the Velvet", 53.74, 53.74, false),
  demo(3, "Soumission", 46.1, 50.1),
  demo(4, "Sharp Objects", 49.99, 47.82),
  demo(5, "Sapiens: A Brief History of Humankind", 54.23, 54.23),
];
