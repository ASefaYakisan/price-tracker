// Products people added by pasting a link. Re-reads each saved page with the generic extractor.
import { createBrowserReader } from '../browser-fetch.js';
import { extractProduct } from '../extract-price.js';
import { fetchText } from '../fetch.js';
import { assertPublicUrl } from '../safe-url.js';
import { saveStatuses, statusChange } from '../link-status.js';
import { budgetFromEnv, oldestFirst, refreshLinks, summary } from '../refresh.js';
import { attemptRow, BLOCKED_STATUSES, botWall, outcomeForError } from '../track-outcome.js';
import { createUnblocker, UNBLOCK_LAYER, UNBLOCK_PLUS_LAYER } from '../unblock-fetch.js';

export const name = 'custom';

// `onBatch(products)` saves prices while the run goes on (see refresh.js); without it the products are returned for the caller to save.
export async function fetchAll({ db, onBatch, refresh = {} } = {}) {
  if (!db) return []; // nothing to refresh without the database that holds the links
  const { data, error } = await db
    .from('products')
    .select('id, url, external_id, added_by, last_checked_at')
    .eq('source', 'custom');
  if (error) throw error;
  const products = [];
  const unblocker = createUnblocker({ db });
  const browser = createBrowserReader();
  let result;
  try {
    result = await refreshLinks(oldestFirst(data), {
      budgetMs: budgetFromEnv() * 60_000,
      ...refresh,
      read: ({ url, external_id: externalId }) => readThroughLayers(url, { externalId, browser, unblocker }),
      onBatch: async (batch) => {
        const found = batch.map(({ result: { product } }) => product).filter(Boolean);
        // Prices first: the attempt log and statuses are only notes about them.
        if (found.length) await (onBatch ? onBatch(found) : products.push(...found));
        await saveAttempts(db, batch.map(({ link, result: a }) => attemptRow({ url: link.url, stage: 'daily', userId: link.added_by, ...a })));
        await saveStatuses(db, batch.map(({ link, result: a }) => ({ id: link.id, ...statusChange(a) })));
      },
    });
  } finally {
    await browser.close();
  }
  console.log(`  ${summary(result)}`);
  if (result.batchErrors.length) throw result.batchErrors[0];
  return products;
}

// Reads a link through the layers, cheapest first: a plain request, then a real browser (free, see browser-fetch.js),
// then the paid scraping API (see unblock-fetch.js) only when both were turned away. Listed shops go straight to the API.
// Whichever layer reads it, a saved externalId is kept (see readLink).
export async function readThroughLayers(url, { retries = 3, externalId = null, browser = null, unblocker = null, guard = assertPublicUrl } = {}) {
  const attempt = await readCheapestFirst(url, { retries, externalId, browser, unblocker, guard });
  return { ...attempt, product: keepExternalId(attempt.product, externalId) };
}

async function readCheapestFirst(url, { retries, externalId, browser, unblocker, guard }) {
  const blocked = await refuseAddress(url, guard);
  if (blocked) return blocked;
  if (unblocker?.listed(url) && (await unblocker.hasCredit())) return readViaApi(url, unblocker);
  const plain = await readLink(url, { retries, externalId, guard });
  const attempt = browser ? await browser.retry(url, plain) : plain;
  if (!refused(plain) || !turnedAway(attempt) || !unblocker || !(await unblocker.hasCredit())) return attempt;
  console.warn(`  ${url}: still blocked, trying the scraping API`);
  return readViaApi(url, unblocker);
}

// A saved link that points at a private address is not opened by any layer, the scraping API included.
async function refuseAddress(url, guard) {
  try {
    await guard(url);
    return null;
  } catch (err) {
    console.warn(`  ${url}: ${err.message ?? err}`);
    return { outcome: 'network', httpStatus: null, layer: null, html: null, product: null };
  }
}

// The shop answered with a status that means it blocks automated visits, or with a robot-check page.
function refused(attempt) {
  if (attempt.outcome === 'no_price') return botWall(attempt.html);
  return attempt.outcome === 'http_error' && BLOCKED_STATUSES.includes(attempt.httpStatus);
}

// No page came back at all; a page without a price would not read any better through the API.
function turnedAway(attempt) {
  return !attempt.product && (refused(attempt) || attempt.outcome === 'timeout' || attempt.outcome === 'network');
}

// One read of a product page, with why it failed when it did.
// A saved externalId is kept, so a change in how links are shortened never splits one product into two rows.
export async function readLink(url, { retries = 3, externalId = null, guard = assertPublicUrl } = {}) {
  let html;
  try {
    html = await fetchText(url, { headers: BROWSER_HEADERS, timeoutMs: 20_000, retries, guard });
  } catch (err) {
    console.warn(`  ${url}: ${err.message ?? err}`);
    return { outcome: outcomeForError(err), httpStatus: err.status ?? null, layer: null, html: null, product: null };
  }
  const product = keepExternalId(extractProduct(html, url), externalId);
  if (!product) console.warn(`  no price found on ${url}`);
  return { outcome: product ? 'ok' : 'no_price', httpStatus: 200, layer: product?.layer ?? null, html, product };
}

// The same read through the scraping API; logged with the "unblock" layer so the monthly count includes it.
async function readViaApi(url, unblocker) {
  const apiLayer = unblocker.plus?.(url) ? UNBLOCK_PLUS_LAYER : UNBLOCK_LAYER;
  let html;
  try {
    html = await unblocker.fetchPage(url);
  } catch (err) {
    console.warn(`  ${url}: ${err.message ?? err}`);
    return { outcome: outcomeForError(err), httpStatus: err.status ?? null, layer: apiLayer, html: null, product: null };
  }
  const product = extractProduct(html, url);
  if (!product) console.warn(`  no price found on ${url} through the scraping API`);
  const layer = [apiLayer, product?.layer].filter(Boolean).join(':');
  return { outcome: product ? 'ok' : 'no_price', httpStatus: 200, layer, html, product };
}

function keepExternalId(product, externalId) {
  return product && externalId ? { ...product, external_id: externalId } : product;
}

// The log helps decide what to fix next; failing to write it never stops the refresh.
async function saveAttempts(db, rows) {
  if (!rows.length) return;
  try {
    const { error } = await db.from('track_attempts').insert(rows);
    if (error) throw error;
  } catch (err) {
    console.warn(`  could not log link attempts: ${err.message ?? err}`);
  }
}

// Many shops refuse requests that do not look like a browser.
export const BROWSER_HEADERS = {
  'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
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
