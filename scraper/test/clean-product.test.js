import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { cleanTitle, pickImage } from '../src/clean-product.js';

// The same cases run against web/src/lib/clean-product.ts (web/test/clean-product.test.mts).
const cases = JSON.parse(readFileSync(new URL('./fixtures/clean-product-cases.json', import.meta.url), 'utf8'));

for (const [raw, expected] of cases.titles) {
  test(`cleanTitle: ${raw}`, () => assert.equal(cleanTitle(raw), expected));
}

for (const c of cases.images) {
  test(`pickImage: ${JSON.stringify(c.candidates)}`, () => assert.equal(pickImage(c.candidates, c.base), c.expect));
}

test('fixesFor cleans a saved Akakçe title and drops a logo image, and leaves good rows alone', async () => {
  const { fixesFor } = await import('../src/fix-products.js');
  assert.deepEqual(fixesFor({ title: 'En ucuz razer viper v3 pro fiyatı,1255022203', image_url: 'https://x.example/static/logo.png' }), {
    title: 'Razer Viper V3 Pro',
    image_url: null,
  });
  assert.deepEqual(fixesFor({ title: 'Razer Viper V3 Pro', image_url: 'https://x.example/p/viper.jpg' }), {});
});
