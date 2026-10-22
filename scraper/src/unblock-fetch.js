// Last-resort reader for shops that turn away datacenter servers (GitHub, Vercel) even with browser headers.
// The page is fetched through a scraping API (ScraperAPI), which opens it from a residential address.
// Off unless SCRAPER_API_KEY is set. Every request costs credits, so it is used only when both the plain request and
// the real browser were turned away, or for hosts listed in UNBLOCK_HOSTS, and it stops for the month after UNBLOCK_MONTHLY_LIMIT credits
// (1 per plain read, RENDER_COST per rendered read).
import { fetchText } from './fetch.js';

// track_attempts.layer for reads through the API: "unblock" alone, or "unblock:<markup>" when a price was found.
// Rendered reads (the API runs the page's scripts first) are logged as "unblock-render..." and cost RENDER_COST credits.
export const UNBLOCK_LAYER = 'unblock';
export const UNBLOCK_RENDER_LAYER = 'unblock-render';
const RENDER_COST = 10;
// Most tracked shops are Turkish, and some (Trendyol) show a country picker instead of the product to foreign addresses.
const DEFAULT_COUNTRY = 'tr';
const ENDPOINT = 'https://api.scraperapi.com/';
const DEFAULT_MONTHLY_LIMIT = 900;
const RETRY_AFTER_HOURS = 24; // a pending link that failed through the API waits this long before the next paid try

export function unblockConfig(env = process.env) {
  const limit = Number.parseInt(env.UNBLOCK_MONTHLY_LIMIT ?? '', 10);
  return {
    apiKey: env.SCRAPER_API_KEY?.trim() || null,
    hosts: (env.UNBLOCK_HOSTS ?? '').split(',').map(normalHost).filter(Boolean),
    // Where the API opens pages from (ScraperAPI country_code); "none" lets the API pick.
    country: countryCode(env.UNBLOCK_COUNTRY),
    // Shops whose page is an empty app shell until its scripts run; none needed one so far.
    renderHosts: (env.UNBLOCK_RENDER_HOSTS ?? '').split(',').map(normalHost).filter(Boolean),
    monthlyLimit: Number.isFinite(limit) && limit >= 0 ? limit : DEFAULT_MONTHLY_LIMIT,
  };
}

function countryCode(value) {
  const code = value?.trim().toLowerCase() || DEFAULT_COUNTRY;
  return code === 'none' ? null : code;
}

function normalHost(host) {
  return host.trim().toLowerCase().replace(/^www\./, '');
}

// Listed shops skip the plain request; subdomains count (m.example.com matches example.com).
export function isListed(hosts, url) {
  let host;
  try {
    host = normalHost(new URL(url).hostname);
  } catch {
    return false;
  }
  return hosts.some((listed) => host === listed || host.endsWith(`.${listed}`));
}

export function apiUrl(apiKey, url, { render = false, country = null } = {}) {
  const extra = { ...(render ? { render: 'true' } : {}), ...(country ? { country_code: country } : {}) };
  return `${ENDPOINT}?${new URLSearchParams({ api_key: apiKey, url, ...extra })}`;
}

function monthStart(now) {
  const date = new Date(now);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

// Credits spent this month, counted from the attempts the scraper logged with an "unblock" layer;
// a rendered read counts RENDER_COST times.
export async function usedThisMonth(db, now = Date.now()) {
  const [all, rendered] = await Promise.all([countLayer(db, UNBLOCK_LAYER, now), countLayer(db, UNBLOCK_RENDER_LAYER, now)]);
  return all + rendered * (RENDER_COST - 1);
}

async function countLayer(db, prefix, now) {
  const { count, error } = await db
    .from('track_attempts')
    .select('id', { count: 'exact', head: true })
    .like('layer', `${prefix}%`)
    .gte('created_at', monthStart(now));
  if (error) throw error;
  return count ?? 0;
}

// Links already tried through the API recently, so the 15-minute pending job does not pay for the same failure again.
export async function recentlyUnblocked(db, urls, now = Date.now()) {
  if (!urls.length) return new Set();
  const { data, error } = await db
    .from('track_attempts')
    .select('url')
    .like('layer', `${UNBLOCK_LAYER}%`)
    .gte('created_at', new Date(now - RETRY_AFTER_HOURS * 3_600_000).toISOString())
    .in('url', urls);
  if (error) throw error;
  return new Set(data.map((row) => row.url));
}

// Returns null when the layer is off. The monthly count needs the database, so without one it stays off too.
export function createUnblocker({ db, env = process.env, now = Date.now(), fetcher = fetchText } = {}) {
  const { apiKey, hosts, renderHosts, country, monthlyLimit } = unblockConfig(env);
  if (!apiKey || !db) return null;
  let used;
  let warned = false;
  return {
    listed: (url) => isListed(hosts, url),
    renders: (url) => isListed(renderHosts, url),
    async hasCredit() {
      if (used === undefined) {
        try {
          used = await usedThisMonth(db, now);
        } catch (err) {
          console.warn(`  scraping API off: could not count this month's requests (${err.message ?? err})`);
          used = Infinity;
        }
      }
      if (used < monthlyLimit) return true;
      if (!warned && Number.isFinite(used)) console.warn(`  scraping API off: monthly limit of ${monthlyLimit} credits reached`);
      warned = true;
      return false;
    },
    async fetchPage(url) {
      const render = isListed(renderHosts, url);
      used += render ? RENDER_COST : 1;
      try {
        try {
          return await fetcher(apiUrl(apiKey, url, { render, country }), { timeoutMs: 70_000, retries: 1 });
        } catch (err) {
          // A plan without that country answers 403, and some shops fail (500) only from that country;
          // failed requests cost nothing, so try once without it.
          if (!country || ![403, 500].includes(err.status)) throw err;
          return await fetcher(apiUrl(apiKey, url, { render }), { timeoutMs: 70_000, retries: 1 });
        }
      } catch (err) {
        // fetchText puts the request URL in its message, and that URL carries the key.
        const reason = err.status ? `HTTP ${err.status}` : String(err.message ?? err).replaceAll(apiKey, '***');
        throw Object.assign(new Error(`scraping API: ${reason}`), { status: err.status, name: err.name, cause: err.cause });
      }
    },
  };
}
