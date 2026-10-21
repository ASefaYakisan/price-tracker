import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pendingLinks } from '../src/pending.js';

// Match the deployed schema: product_latest predates products.added_by.
function fakeDb(pending = [{ id: 1, url: 'https://shop.example/p-1' }]) {
  const calls = [];
  const tables = {
    product_latest: { columns: ['id', 'url'], rows: pending },
    products: { columns: ['id', 'added_by'], rows: [{ id: 1, added_by: 'owner-1' }] },
  };
  return {
    calls,
    from(table) {
      calls.push(['from', table]);
      let error = null;
      const query = new Proxy({}, {
        get: (_, method) => method === 'then'
          ? (resolve) => resolve({ data: error ? null : tables[table].rows, error })
          : (...args) => {
              calls.push([method, ...args]);
              if (method === 'select' && args[0].split(',').some((column) => !tables[table].columns.includes(column.trim()))) {
                error = { code: '42703', message: `column does not exist in ${table}` };
              }
              return query;
            },
      });
      return query;
    },
  };
}

test('pending links work with the original view schema and keep owner attribution', async () => {
  const db = fakeDb();
  const links = await pendingLinks(db, Date.parse('2026-10-21T12:00:00Z'));
  assert.deepEqual(links, [{ url: 'https://shop.example/p-1', added_by: 'owner-1' }]);
  assert.deepEqual(db.calls.slice(0, 1), [['from', 'product_latest']]);
  assert.ok(db.calls.some((c) => c[0] === 'eq' && c[1] === 'source' && c[2] === 'custom'));
  assert.ok(db.calls.some((c) => c[0] === 'is' && c[1] === 'scraped_at' && c[2] === null));
  assert.ok(db.calls.some((c) => c[0] === 'gte' && c[1] === 'created_at' && c[2] === '2026-10-19T12:00:00.000Z'));
  assert.ok(db.calls.some((c) => c[0] === 'in' && c[1] === 'id' && c[2].length === 1 && c[2][0] === 1));
});

test('an empty pending queue returns without looking up owners', async () => {
  const db = fakeDb([]);
  assert.deepEqual(await pendingLinks(db), []);
  assert.equal(db.calls.filter((c) => c[0] === 'from').length, 1);
});
