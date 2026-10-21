import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readPrice } from '../src/extract-price.js';

// The same cases run against web/src/lib/extract-price.ts (web/test/extract.test.ts).
const dir = new URL('./fixtures/shops/', import.meta.url);
const cases = JSON.parse(readFileSync(new URL('cases.json', dir), 'utf8'));

for (const c of cases) {
  test(`${c.file} (${c.url}) -> ${c.layer}`, () => {
    const result = readPrice(readFileSync(new URL(c.file, dir), 'utf8'), c.url);
    assert.ok(result, 'no price found');
    assert.equal(result.layer, c.layer);
    for (const [key, value] of Object.entries(c.expect)) assert.equal(result.product[key], value, key);
  });
}
