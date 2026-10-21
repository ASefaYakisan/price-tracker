import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pendingLinks } from '../src/pending.js';

// Records the query the job sends, so the filters can be checked without a database.
function fakeDb(rows) {
  const calls = [];
  const query = new Proxy(
    {},
    {
      get: (_, method) =>
        method === 'then'
          ? (resolve) => resolve({ data: rows, error: null })
          : (...args) => {
              calls.push([method, ...args]);
              return query;
            },
    },
  );
  return { calls, from: (table) => (calls.push(['from', table]), query) };
}

test('pending links are pasted links without a price from the last two days', async () => {
  const db = fakeDb([{ url: 'https://shop.example/p-1', added_by: null }]);
  const links = await pendingLinks(db, Date.parse('2026-10-21T12:00:00Z'));
  assert.deepEqual(links, [{ url: 'https://shop.example/p-1', added_by: null }]);
  assert.deepEqual(db.calls.slice(0, 1), [['from', 'product_latest']]);
  assert.ok(db.calls.some((c) => c[0] === 'eq' && c[1] === 'source' && c[2] === 'custom'));
  assert.ok(db.calls.some((c) => c[0] === 'is' && c[1] === 'scraped_at' && c[2] === null));
  assert.ok(db.calls.some((c) => c[0] === 'gte' && c[1] === 'created_at' && c[2] === '2026-10-19T12:00:00.000Z'));
});
