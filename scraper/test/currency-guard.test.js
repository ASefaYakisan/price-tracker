import assert from 'node:assert/strict';
import test from 'node:test';
import { checkCurrency, guardRead } from '../src/currency-guard.js';
import { errorCode } from '../src/link-status.js';

const read = (currency) => ({ outcome: 'ok', httpStatus: 200, layer: 'json-ld', product: { url: 'https://shop.example/p', price: 1299, currency } });

test('a saved currency stays when the page shows none', () => {
  assert.deepEqual(checkCurrency('TRY', null), { accept: true, currency: 'TRY' });
  assert.equal(guardRead(read(null), 'TRY').product.currency, 'TRY');
});

test('a reading in another currency is not saved and is logged with its reason', () => {
  const guarded = guardRead(read('USD'), 'TRY');
  assert.equal(guarded.product, null);
  assert.equal(guarded.outcome, 'no_price');
  assert.equal(errorCode(guarded), 'currency_changed');
});

test('the first reading is accepted as it is', () => {
  assert.equal(guardRead(read('TRY'), null).product.currency, 'TRY');
  assert.equal(guardRead(read(null), null).product.currency, null);
});

test('the same currency passes, whatever the letter case', () => {
  assert.equal(guardRead(read('TRY'), 'try').product.currency, 'TRY');
});

test('a failed read is passed through untouched', () => {
  const failed = { outcome: 'http_error', httpStatus: 403, product: null };
  assert.equal(guardRead(failed, 'TRY'), failed);
});
