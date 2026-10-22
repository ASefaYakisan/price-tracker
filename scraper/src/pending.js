// Links the site saved without a price because the shop turned its server away (see web/src/app/api/track/route.ts).
// Runs every 15 minutes on GitHub Actions, whose servers some of those shops still answer;
// a link that still fails is opened in a real Chromium (browser-fetch.js), and only then, when a key is set,
// read through the scraping API (unblock-fetch.js). After 3 failed tries it is marked 'failed' (link-status.js)
// and left to the daily refresh until its owner presses "Try again".
import { readThroughLayers } from './adapters/custom.js';
import { createBrowserReader } from './browser-fetch.js';
import { sleep } from './fetch.js';
import { saveStatuses, statusChange } from './link-status.js';
import { createStore } from './store.js';
import { attemptRow } from './track-outcome.js';
import { createUnblocker, recentlyUnblocked } from './unblock-fetch.js';

// Links without a price that have not given up yet; tries are capped by MAX_PENDING_TRIES, not by age.
export async function pendingLinks(db) {
  const { data, error } = await db
    .from('product_latest')
    .select('id, url')
    .eq('source', 'custom')
    .is('scraped_at', null)
    .neq('status', 'failed')
    .order('created_at')
    .limit(50);
  if (error) throw error;
  if (!data.length) return [];

  // The view predates added_by and does not list it.
  const { data: owners, error: ownerError } = await db
    .from('products')
    .select('id, added_by, failed_checks')
    .in('id', data.map((product) => product.id));
  if (ownerError) throw ownerError;
  const byId = new Map(owners.map((product) => [product.id, product]));
  return data.map(({ id, url }) => ({
    id,
    url,
    added_by: byId.get(id)?.added_by ?? null,
    failed_checks: byId.get(id)?.failed_checks ?? 0,
  }));
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
  const statuses = [];
  const unblocker = createUnblocker({ db: store.db });
  const triedToday = unblocker ? await skipList(store.db, links) : new Set();
  // A real browser gets past shops that only render the price with scripts or turn plain requests away.
  const browser = createBrowserReader({ maxPages: 25 });
  try {
    for (const { id, url, added_by: userId, failed_checks: failedChecks } of links) {
      const attempt = await readThroughLayers(url, { retries: 1, browser, unblocker: triedToday.has(url) ? null : unblocker });
      console.log(`  ${attempt.outcome}${attempt.httpStatus ? ` ${attempt.httpStatus}` : ''}${attempt.layer ? ` (${attempt.layer})` : ''} ${url}`);
      attempts.push(attemptRow({ url, stage: 'daily', userId, ...attempt }));
      statuses.push({ id, ...statusChange(attempt, { pending: true, failedChecks }) });
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
  await saveStatuses(store.db, statuses);
  console.log(`${products.length} of ${links.length} read a price`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
