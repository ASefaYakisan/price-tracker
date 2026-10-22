// Links the site saved without a price because the shop turned its server away (see web/src/app/api/track/route.ts).
// Runs every 15 minutes on GitHub Actions, whose servers some of those shops still answer;
// a link that still fails is opened in a real Chromium (browser-fetch.js), and only then, when a key is set,
// read through the scraping API (unblock-fetch.js).
import { readThroughLayers } from './adapters/custom.js';
import { createBrowserReader } from './browser-fetch.js';
import { sleep } from './fetch.js';
import { createStore } from './store.js';
import { attemptRow } from './track-outcome.js';
import { createUnblocker, recentlyUnblocked } from './unblock-fetch.js';

const WINDOW_HOURS = 48; // after that the daily scrape keeps trying, without the 15-minute retries

export async function pendingLinks(db, now = Date.now()) {
  const since = new Date(now - WINDOW_HOURS * 3_600_000).toISOString();
  const { data, error } = await db
    .from('product_latest')
    .select('id, url')
    .eq('source', 'custom')
    .is('scraped_at', null)
    .gte('created_at', since)
    .order('created_at')
    .limit(50);
  if (error) throw error;
  if (!data.length) return [];

  // The view predates added_by; its p.* does not include columns added later.
  const { data: owners, error: ownerError } = await db
    .from('products')
    .select('id, added_by')
    .in('id', data.map((product) => product.id));
  if (ownerError) throw ownerError;
  const ownerById = new Map(owners.map((product) => [product.id, product.added_by]));
  return data.map(({ id, url }) => ({ url, added_by: ownerById.get(id) ?? null }));
}

async function skipList(db, links) {
  try {
    return await recentlyUnblocked(db, links.map((link) => link.url));
  } catch (err) {
    console.warn(`  scraping API off for this run: ${err.message ?? err}`);
    return new Set(links.map((link) => link.url));
  }
}

async function main() {
  const store = createStore();
  if (!store.db) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to read pending links.');
  const links = await pendingLinks(store.db);
  console.log(`${links.length} pending links`);
  const products = [];
  const attempts = [];
  const unblocker = createUnblocker({ db: store.db });
  const triedToday = unblocker ? await skipList(store.db, links) : new Set();
  // A real browser gets past shops that only render the price with scripts or turn plain requests away.
  const browser = createBrowserReader({ maxPages: 25 });
  try {
    for (const { url, added_by: userId } of links) {
      const attempt = await readThroughLayers(url, { retries: 1, browser, unblocker: triedToday.has(url) ? null : unblocker });
      console.log(`  ${attempt.outcome}${attempt.httpStatus ? ` ${attempt.httpStatus}` : ''}${attempt.layer ? ` (${attempt.layer})` : ''} ${url}`);
      attempts.push(attemptRow({ url, stage: 'daily', userId, ...attempt }));
      if (attempt.product) products.push(attempt.product);
      await sleep(1500);
    }
  } finally {
    await browser.close();
  }
  if (products.length) await store.save('custom', products, new Date().toISOString());
  if (attempts.length) {
    const { error } = await store.db.from('track_attempts').insert(attempts);
    if (error) console.warn(`  could not log link attempts: ${error.message}`);
  }
  console.log(`${products.length} of ${links.length} read a price`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
