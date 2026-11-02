import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAll } from '../src/adapters/custom.js';

// A table whose every query ends in the same rows, whatever is selected, ordered or ranged.
function fakeDb(tables) {
  return {
    from(table) {
      const rows = tables[table] ?? [];
      const query = { select: () => query, eq: () => query, order: () => query, range: () => query, then: (ok) => ok({ data: rows, error: null }) };
      return query;
    },
  };
}

test('a link nobody follows and no alert watches is kept but not refreshed', async () => {
  const db = fakeDb({
    products: [{ id: 7, url: 'https://shop.example/p/7', external_id: 'p7', added_by: null }],
    user_products: [],
    alerts: [],
  });
  assert.deepEqual(await fetchAll({ db }), []);
});
