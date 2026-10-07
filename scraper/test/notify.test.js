import assert from 'node:assert/strict';
import test from 'node:test';
import { priceDrops, sendTelegram, sheetRows, syncSheet, telegramDigest } from '../src/notify.js';

const rows = [
  { id: 1, title: 'Lamp <b>', source: 'custom', url: 'https://s/l', currency: 'USD', price: 90, previous_price: 100, in_stock: true, scraped_at: 't' },
  { id: 2, title: 'Mug', source: 'custom', url: 'https://s/m', currency: 'USD', price: 99, previous_price: 100, in_stock: false, scraped_at: 't' },
  { id: 3, title: 'New', source: 'custom', url: 'https://s/n', currency: 'USD', price: 5, previous_price: null, in_stock: true, scraped_at: 't' },
];

test('priceDrops keeps drops above the threshold, biggest first', () => {
  assert.deepEqual(priceDrops(rows, 2).map((r) => r.id), [1]);
  assert.deepEqual(priceDrops(rows, 0.5).map((r) => r.id), [1, 2]);
});

test('telegramDigest escapes titles and links to the site', () => {
  const text = telegramDigest(priceDrops(rows), { siteUrl: 'https://site.app' });
  assert.match(text, /1 price drop today/);
  assert.match(text, /href="https:\/\/site\.app\/products\/1">Lamp &lt;b&gt;</);
  assert.match(text, /\$100\.00 → <b>\$90\.00<\/b>/);
  assert.equal(telegramDigest([]), null);
});

test('sheetRows builds a header plus one row per item', () => {
  const { latest, history } = sheetRows(rows, '2026-10-07T06:00:00Z');
  assert.equal(latest.length, 4);
  assert.deepEqual(latest[1].slice(0, 7), ['Lamp <b>', 'custom', 90, 100, -10, 'USD', 'yes']);
  assert.equal(latest[2][6], 'no');
  assert.deepEqual(history[0], ['2026-10-07T06:00:00Z', 'Lamp <b>', 'custom', 90, 'USD']);
});

test('outputs are skipped when their secrets are missing', async () => {
  assert.match(await sendTelegram(rows, {}), /^skipped/);
  assert.match(await syncSheet(rows, 't', {}), /^skipped/);
});
