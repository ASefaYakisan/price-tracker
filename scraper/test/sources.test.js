import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseRates } from '../src/adapters/tcmb.js';
import { parseMarkets } from '../src/adapters/coingecko.js';
import { parseGold } from '../src/adapters/gold.js';

test('tcmb: keeps selected currencies and divides by unit', async () => {
  const xml = await readFile(new URL('./fixtures/tcmb-today.xml', import.meta.url), 'utf8');
  const rates = parseRates(xml);
  assert.deepEqual(rates.map((r) => r.external_id), ['USD', 'JPY']);
  assert.equal(rates[0].title, 'US Dollar (USD/TRY)');
  assert.equal(rates[0].price, 49.1802);
  assert.equal(rates[0].currency, 'TRY');
  assert.equal(rates[1].price, 0.3282);
});

test('coingecko: maps market rows and skips coins without a price', () => {
  const rows = parseMarkets([
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: 'https://img/btc.png', current_price: 123456.7 },
    { id: 'ghost', symbol: 'gh', name: 'Ghost', image: null, current_price: null },
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    external_id: 'bitcoin',
    title: 'Bitcoin (BTC)',
    url: 'https://www.coingecko.com/en/coins/bitcoin',
    image_url: 'https://img/btc.png',
    price: 123456.7,
    currency: 'USD',
    in_stock: true,
    rating: null,
  });
  assert.throws(() => parseMarkets({ status: { error_code: 429 } }));
});

test('gold: converts ounce to gram in TRY', () => {
  const [gram, ounce] = parseGold({ date: '2026-10-06', xau: { try: 202736.4545344, usd: 4122.70489019 } });
  assert.equal(gram.price, 6518.13);
  assert.equal(gram.currency, 'TRY');
  assert.equal(ounce.price, 4122.7);
  assert.throws(() => parseGold({ date: 'x' }));
});
