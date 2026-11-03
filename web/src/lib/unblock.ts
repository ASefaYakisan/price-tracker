// Reads a page through a scraping API (ScraperAPI) when the shop turned Vercel's server away, so a link gets its
// price right away instead of waiting for the GitHub reader. Port of the plain-read part of scraper/src/unblock-fetch.js.
// Off unless SCRAPER_API_KEY is set on the web server. Every request costs credits: it stops for the month at UNBLOCK_MONTHLY_LIMIT.
import type { SupabaseClient } from "@supabase/supabase-js";

export const UNBLOCK_LAYER = "unblock"; // track_attempts.layer prefix, shared with the scraper's monthly count
const ENDPOINT = "https://api.scraperapi.com/";
const DEFAULT_LIMIT = 900;
const TOTAL_MS = 22_000; // one budget for the whole read, so the visitor never waits long on a shop the API cannot open

// Shops answer with their own country's page; Turkish shops need a Turkish address (Trendyol shows a country picker otherwise).
// Same table as scraper/src/unblock-fetch.js ("uk" is what ScraperAPI calls Great Britain).
const TLD_COUNTRY: Record<string, string> = {
  tr: "tr", uk: "uk", de: "de", fr: "fr", it: "it", es: "es", nl: "nl", be: "be", at: "de", ie: "uk", pt: "es", pl: "pl", se: "se",
  jp: "jp", in: "in", ae: "ae", sa: "sa", au: "au", ca: "ca", br: "br", mx: "mx", sg: "sg", kr: "kr", za: "za", us: "us",
};
// Generic .com shops that are Turkish; any other .com/.net/.org shop is read from the US (Walmart, Best Buy, Target, eBay, AliExpress...).
const TURKISH_COM = /(^|\.)(trendyol|hepsiburada|n11|teknosa|vatanbilgisayar|itopya|akakce|lcw|ciceksepeti|gittigidiyor|morhipo)\.com$/;

export function countryFor(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (TURKISH_COM.test(host)) return "tr";
  const tld = host.split(".").at(-1) ?? "";
  if (tld.length === 2) return TLD_COUNTRY[tld] ?? null;
  return "us";
}

export function apiUrl(apiKey: string, url: string, country: string | null) {
  return `${ENDPOINT}?${new URLSearchParams({ api_key: apiKey, url, ...(country ? { country_code: country } : {}) })}`;
}

export function monthlyLimit(env: Record<string, string | undefined> = process.env) {
  const n = Number.parseInt(env.UNBLOCK_MONTHLY_LIMIT ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_LIMIT;
}

function monthStart(now: number) {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// Credits used this month (plain reads cost 1; rendered/premium "unblock-plus" reads from the scraper cost 10).
export async function creditsLeft(db: SupabaseClient, env = process.env, now = Date.now()) {
  const q = (like: string) =>
    db.from("track_attempts").select("id", { count: "exact", head: true }).like("layer", like).gte("created_at", monthStart(now));
  const [all, plus] = await Promise.all([q(`${UNBLOCK_LAYER}%`), q(`${UNBLOCK_LAYER}-plus%`)]);
  if (all.error || plus.error) return false; // cannot count, so do not spend
  const used = (all.count ?? 0) + (plus.count ?? 0) * 9;
  return used < monthlyLimit(env);
}

// Returns the page HTML, or null when the layer is off, over budget or the read failed. Never throws.
export async function fetchViaApi(
  url: string,
  db: SupabaseClient,
  env: Record<string, string | undefined> = process.env,
  doFetch: typeof fetch = fetch,
): Promise<string | null> {
  const apiKey = env.SCRAPER_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    if (!(await creditsLeft(db, env as typeof process.env))) return null;
    const country = countryFor(new URL(url).hostname);
    const signal = AbortSignal.timeout(TOTAL_MS);
    let res = await doFetch(apiUrl(apiKey, url, country), { signal });
    // A plan without that country answers 403, and some shops fail only from that country; failed requests cost nothing.
    if (!res.ok && country && [403, 500].includes(res.status)) res = await doFetch(apiUrl(apiKey, url, null), { signal });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 5_000_000 ? null : text;
  } catch {
    return null;
  }
}
