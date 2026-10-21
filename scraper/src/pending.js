// Links the site saved without a price because the shop turned its server away (see web/src/app/api/track/route.ts).
// Runs every 15 minutes on GitHub Actions, whose servers some of those shops still answer.
import { readLink } from './adapters/custom.js';
import { sleep } from './fetch.js';
import { createStore } from './store.js';
import { attemptRow } from './track-outcome.js';

const WINDOW_HOURS = 48; // after that the daily scrape keeps trying, without the 15-minute retries

export async function pendingLinks(db, now = Date.now()) {
  const since = new Date(now - WINDOW_HOURS * 3_600_000).toISOString();
  const { data, error } = await db
    .from('product_latest')
    .select('url, added_by')
    .eq('source', 'custom')
    .is('scraped_at', null)
    .gte('created_at', since)
    .order('created_at')
    .limit(50);
  if (error) throw error;
  return data;
}

async function main() {
  const store = createStore();
  if (!store.db) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to read pending links.');
  const links = await pendingLinks(store.db);
  console.log(`${links.length} pending links`);
  const products = [];
  const attempts = [];
  for (const { url, added_by: userId } of links) {
    const attempt = await readLink(url, { retries: 1 });
    console.log(`  ${attempt.outcome}${attempt.httpStatus ? ` ${attempt.httpStatus}` : ''} ${url}`);
    attempts.push(attemptRow({ url, stage: 'daily', userId, ...attempt }));
    if (attempt.product) products.push(attempt.product);
    await sleep(1500);
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
