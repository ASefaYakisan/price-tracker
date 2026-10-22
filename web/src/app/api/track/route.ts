import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { currentUser } from "@/lib/supabase/server";
import { isDemo } from "@/lib/data";
import { canonicalUrl, extractProduct } from "@/lib/extract-price";
import { findUrl } from "@/lib/find-url";
import { assertPublicUrl } from "@/lib/safe-url";
import { trackLimitMessage } from "@/lib/track-limits";
import { attemptRow, botWall, messageFor, outcomeForError, retryLater, type TrackOutcome } from "@/lib/track-outcome";

const MAX_CUSTOM = 5000; // safety ceiling for the whole site; the per-account limits in track-limits.ts do the real work
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
    // Failed reads count too (track_attempts), so an account cannot make the server open pages without end.
    const [recent, owned, attempts] = await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }).eq("added_by", user.id).gte("created_at", hourAgo),
      db.from("products").select("id", { count: "exact", head: true }).eq("added_by", user.id),
      db.from("track_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("stage", "add").gte("created_at", hourAgo),
    ]);
    const limit = trackLimitMessage({ recentLinks: recent.count, ownedLinks: owned.count, recentAttempts: attempts.count });
    if (limit) return fail(limit, 429);
  }

  const body = await request.json().catch(() => null);
  let url: URL;
  try {
    // The box also takes a shop app's share text; the link inside it is what gets read.
    const text = String(body?.url ?? "");
    url = await assertPublicUrl(findUrl(text) ?? text);
  } catch (err) {
    return fail((err as Error).message, 400);
  }

  // Every read is logged with its reason, so we can see which shops fail and why.
  let html: string;
  let status: number;
  try {
    const res = await fetchPublic(url);
    status = res.status;
    if (!res.ok) throw new ReadError("http_error", status);
    html = await res.text().then(
      (text) => text.slice(0, 3_000_000),
      (err) => {
        throw new ReadError(outcomeForError(err));
      },
    );
    url = new URL(res.url || url.href);
  } catch (err) {
    const e = err instanceof ReadError ? err : new ReadError("network");
    await logAttempt(db, attemptRow({ url: url.href, stage: "add", outcome: e.outcome, httpStatus: e.httpStatus, userId: user?.id }));
    if (db && user && retryLater(e.outcome, e.httpStatus)) return savePending(db, url, user.id, e.message);
    return fail(e.message, 422);
  }

  const product = extractProduct(html, url.href);
  await logAttempt(
    db,
    attemptRow({ url: url.href, stage: "add", outcome: product ? "ok" : "no_price", httpStatus: status, layer: product?.layer, userId: user?.id }),
  );
  if (!product && db && user && botWall(html)) return savePending(db, url, user.id, messageFor("http_error", 403));
  if (!product) return fail(messageFor("no_price"), 422);
  if (isDemo || !db || !user) return Response.json({ ok: true, demo: true, product });

  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("source", "custom");
  if ((count ?? 0) >= MAX_CUSTOM) return fail("This demo already tracks the maximum number of links.", 429);

  // `layer` only goes to track_attempts; products has no column for it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { in_stock, price, layer, ...fields } = product;
  const { data: row, error } = await db
    .from("products")
    .upsert({ ...fields, source: "custom", last_seen_at: new Date().toISOString() }, { onConflict: "source,external_id" })
    .select("id")
    .single();
  if (error) return fail("Could not save the product. Please try again.", 500);
  const { error: histError } = await db.from("price_history").insert({ product_id: row.id, price, in_stock });
  if (histError) return fail("Could not save the price. Please try again.", 500);
  // added_by records who brought the link in; everyone who adds it gets it in their own list.
  await db.from("products").update({ added_by: user.id }).eq("id", row.id).is("added_by", null);
  await addToList(db, user.id, row.id);

  revalidateTag("products", { expire: 0 });
  return Response.json({ ok: true, id: row.id, product });
}

// Saves the link without a price; scraper/src/pending.js reads it from GitHub's servers within the hour.
// A link someone already tracks keeps its title and history.
async function savePending(db: SupabaseClient, url: URL, userId: string, readError: string) {
  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("source", "custom");
  if ((count ?? 0) >= MAX_CUSTOM) return fail(readError, 422);
  const externalId = canonicalUrl(url.href);
  const { error } = await db
    .from("products")
    .upsert({ source: "custom", external_id: externalId, title: titleFromUrl(url), url: url.href }, { onConflict: "source,external_id", ignoreDuplicates: true });
  const { data: row } = await db.from("products").select("id").eq("source", "custom").eq("external_id", externalId).maybeSingle();
  if (error || !row) return fail(readError, 422);
  await db.from("products").update({ added_by: userId }).eq("id", row.id).is("added_by", null);
  await addToList(db, userId, row.id);
  revalidateTag("products", { expire: 0 });
  return Response.json({ ok: true, id: row.id, pending: true });
}

async function addToList(db: SupabaseClient, userId: string, productId: number) {
  await db.from("user_products").upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
}

// "samsung-galaxy-s25-ultra-...-p-HBCV00007MIF54" -> "Samsung galaxy s25 ultra ...", until the real name is read.
function titleFromUrl(url: URL) {
  const longest = url.pathname.split("/").filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? "";
  let slug = longest;
  try {
    slug = decodeURIComponent(longest);
  } catch {}
  slug = slug
    .replace(/\.html?$/i, "")
    .replace(/-p-[a-z0-9]+$/i, "")
    .replace(/[-_+]+/g, " ")
    .trim();
  const words = slug.length >= 8 && /[a-z]/i.test(slug) ? slug : url.hostname.replace(/^www\./, "");
  return (words[0].toUpperCase() + words.slice(1)).slice(0, 300);
}

// Follows redirects by hand so every hop gets the same public-address check.
async function fetchPublic(start: URL) {
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: "manual", signal: AbortSignal.timeout(15_000) }).catch((err) => {
      throw new ReadError(outcomeForError(err));
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    url = await assertPublicUrl(new URL(location, url).href).catch((err) => {
      throw new ReadError("network", null, (err as Error).message);
    });
  }
  throw new ReadError("network", null, "That link redirects too many times.");
}

// A failed read of the shop's page: the reason goes to track_attempts, the message to the visitor.
class ReadError extends Error {
  outcome: TrackOutcome;
  httpStatus: number | null;
  constructor(outcome: TrackOutcome, httpStatus: number | null = null, message = messageFor(outcome, httpStatus)) {
    super(message);
    this.outcome = outcome;
    this.httpStatus = httpStatus;
  }
}

// A failed log write never stops the link from being added.
async function logAttempt(db: SupabaseClient | null, row: ReturnType<typeof attemptRow>) {
  if (!db) return;
  await db
    .from("track_attempts")
    .insert(row)
    .then(
      () => {},
      () => {},
    );
}

function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}
