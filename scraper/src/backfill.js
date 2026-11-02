// Fills in the last 30 days of price history for coins that were just added, from CoinGecko's public
// market_chart endpoint (real daily prices, nothing estimated). Shops and other sources have no public history,
// so their charts start the day the link was added. Runs after the daily scrape; coins that already have
// older rows are skipped, so it is safe to run again.
import { fetchJson, sleep } from './fetch.js';
import { createStore } from './store.js';

const DAYS = 30;
const API = 'https://api.coingecko.com/api/v3/coins';

// One point per day (the last one of that day), only those before `before`.
export function dailyPoints(prices, before) {
  if (!Array.isArray(prices)) throw new Error('Unexpected CoinGecko chart response');
  const perDay = new Map();
  for (const [time, price] of prices) {
    if (typeof time !== 'number' || typeof price !== 'number' || time >= before) continue;
    perDay.set(new Date(time).toISOString().slice(0, 10), { scraped_at: new Date(time).toISOString(), price });
  }
  return [...perDay.values()];
}

export async function backfillCoins(db, { sleepMs = 7000 } = {}) {
  const { data: coins, error } = await db.from('products').select('id, external_id').eq('source', 'coingecko');
  if (error) throw error;
  const key = process.env.COINGECKO_API_KEY;
  let filled = 0;
  for (const coin of coins) {
    const { data: first, error: firstError } = await db
      .from('price_history')
      .select('scraped_at')
      .eq('product_id', coin.id)
      .order('scraped_at')
      .limit(1);
    if (firstError) throw firstError;
    const start = first[0] ? Date.parse(first[0].scraped_at) : Date.now();
    if (start < Date.now() - (DAYS - 1) * 86_400_000) continue; // already has a month of history
    try {
      const chart = await fetchJson(`${API}/${encodeURIComponent(coin.external_id)}/market_chart?vs_currency=usd&days=${DAYS}`, {
        headers: key ? { 'x-cg-demo-api-key': key } : {},
      });
      const rows = dailyPoints(chart.prices, start).map((p) => ({ product_id: coin.id, in_stock: true, ...p }));
      if (rows.length) {
        const { error: insertError } = await db.from('price_history').insert(rows);
        if (insertError) throw insertError;
        filled++;
        console.log(`  ${coin.external_id}: ${rows.length} days of history added`);
      }
    } catch (err) {
      console.warn(`  ${coin.external_id}: backfill skipped (${err.message ?? err})`);
    }
    await sleep(sleepMs); // CoinGecko's free tier allows only a few requests a minute
  }
  return filled;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const store = createStore();
  if (!store.db) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to backfill history.');
  backfillCoins(store.db)
    .then((n) => console.log(`${n} coins backfilled`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
