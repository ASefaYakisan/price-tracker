// Products people added by pasting a link. Re-reads each saved page with the generic extractor.
import { extractProduct } from '../extract-price.js';
import { fetchText, sleep } from '../fetch.js';
import { attemptRow, outcomeForError } from '../track-outcome.js';

export const name = 'custom';

export async function fetchAll({ db } = {}) {
  if (!db) return []; // nothing to refresh without the database that holds the links
  const { data, error } = await db.from('products').select('url, external_id, added_by').eq('source', 'custom');
  if (error) throw error;
  const products = [];
  const attempts = [];
  for (const { url, external_id: externalId, added_by: userId } of data) {
    const attempt = await readLink(url, { externalId });
    attempts.push(attemptRow({ url, stage: 'daily', userId, ...attempt }));
    if (attempt.product) products.push(attempt.product);
    await sleep(1500);
  }
  await saveAttempts(db, attempts);
  return products;
}

// One read of a product page, with why it failed when it did.
// A saved externalId is kept, so a change in how links are shortened never splits one product into two rows.
export async function readLink(url, { retries = 3, externalId = null } = {}) {
  let html;
  try {
    html = await fetchText(url, { headers: BROWSER_HEADERS, timeoutMs: 20_000, retries });
  } catch (err) {
    console.warn(`  ${url}: ${err.message ?? err}`);
    return { outcome: outcomeForError(err), httpStatus: err.status ?? null, html: null, product: null };
  }
  const read = extractProduct(html, url);
  const product = read && externalId ? { ...read, external_id: externalId } : read;
  if (!product) console.warn(`  no price found on ${url}`);
  return { outcome: product ? 'ok' : 'no_price', httpStatus: 200, layer: product?.layer ?? null, html, product };
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
