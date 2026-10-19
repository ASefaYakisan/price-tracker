import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { currentUser } from "@/lib/supabase/server";
import { isDemo } from "@/lib/data";
import { extractProduct } from "@/lib/extract-price";
import { assertPublicUrl } from "@/lib/safe-url";

const MAX_CUSTOM = 100; // keeps the public demo from being filled by strangers
const PER_HOUR = 10; // links one account may add per hour
const PER_ACCOUNT = 30; // links one account may own in total
const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  "sec-ch-ua": '"Chromium";v="141", "Google Chrome";v="141", "Not?A_Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

// POST { url } -> reads the price from the page now, saves it, and the daily job keeps checking it.
export async function POST(request: Request) {
  // Sign-in comes first, so strangers cannot make the server open pages for them.
  const user = isDemo ? null : await currentUser();
  if (!isDemo && !user) return fail("Sign in to track a link.", 401);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isDemo && !serviceKey) return fail("Adding links is not switched on for this site yet.", 503);
  const db = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })
    : null;
  if (db && user) {
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const [recent, owned] = await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }).eq("added_by", user.id).gte("created_at", hourAgo),
      db.from("products").select("id", { count: "exact", head: true }).eq("added_by", user.id),
    ]);
    if ((recent.count ?? 0) >= PER_HOUR) return fail("You added many links in the last hour. Try again later.", 429);
    if ((owned.count ?? 0) >= PER_ACCOUNT) return fail("Your account already tracks the maximum number of links.", 429);
  }

  const body = await request.json().catch(() => null);
  let url: URL;
  try {
    url = await assertPublicUrl(String(body?.url ?? ""));
  } catch (err) {
    return fail((err as Error).message, 400);
  }

  let html: string;
  try {
    const res = await fetchPublic(url);
    if (!res.ok) return fail("The shop refused the request. Some shops block automated visits.", 422);
    html = (await res.text()).slice(0, 3_000_000);
    url = new URL(res.url || url.href);
  } catch (err) {
    return fail((err as Error).message || "Could not open that page. Check the link and try again.", 422);
  }

  const product = extractProduct(html, url.href);
  if (!product) return fail("No price found on that page. Paste the link of a single product page.", 422);
  if (isDemo || !db || !user) return Response.json({ ok: true, demo: true, product });

  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("source", "custom");
  if ((count ?? 0) >= MAX_CUSTOM) return fail("This demo already tracks the maximum number of links.", 429);

  const { in_stock, price, ...fields } = product;
  const { data: row, error } = await db
    .from("products")
    .upsert({ ...fields, source: "custom", last_seen_at: new Date().toISOString() }, { onConflict: "source,external_id" })
    .select("id")
    .single();
  if (error) return fail("Could not save the product. Please try again.", 500);
  const { error: histError } = await db.from("price_history").insert({ product_id: row.id, price, in_stock });
  if (histError) return fail("Could not save the price. Please try again.", 500);
  // The first person to add a link owns it; adding the same link again keeps the original owner.
  await db.from("products").update({ added_by: user.id }).eq("id", row.id).is("added_by", null);

  revalidateTag("products", { expire: 0 });
  return Response.json({ ok: true, id: row.id, product });
}

// Follows redirects by hand so every hop gets the same public-address check.
async function fetchPublic(start: URL) {
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: "manual", signal: AbortSignal.timeout(15_000) }).catch(() => {
      throw new Error("Could not open that page. Check the link and try again.");
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    url = await assertPublicUrl(new URL(location, url).href);
  }
  throw new Error("That link redirects too many times.");
}

function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}
