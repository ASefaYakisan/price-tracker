import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_KEEP_DAYS, keepDays, pruneAttempts } from '../src/prune.js';

const NOW = Date.parse('2026-11-03T00:00:00Z');
const DAY = 86_400_000;

function fakeDb(rows, error = null) {
  return {
    rows,
    from(table) {
      assert.equal(table, 'track_attempts');
      return {
        delete: () => ({
          lt: (column, cutoff) => ({
            select: async () => {
              if (error) return { data: null, error };
              const gone = rows.filter((r) => r[column] < cutoff);
              rows.splice(0, rows.length, ...rows.filter((r) => r[column] >= cutoff));
              return { data: gone.map(({ id }) => ({ id })), error: null };
            },
          }),
        }),
      };
    },
  };
}

test('deletes only attempts older than the retention window', async () => {
  const at = (days) => new Date(NOW - days * DAY).toISOString();
  const db = fakeDb([{ id: 1, created_at: at(120) }, { id: 2, created_at: at(91) }, { id: 3, created_at: at(89) }, { id: 4, created_at: at(1) }]);
  assert.equal(await pruneAttempts(db, { days: 90, now: NOW }), 2);
  assert.deepEqual(db.rows.map((r) => r.id), [3, 4]);
});

test('a database error is thrown for the caller to log', async () => {
  await assert.rejects(pruneAttempts(fakeDb([], { message: 'boom' }), { now: NOW }), { message: 'boom' });
});

test('TRACK_ATTEMPTS_KEEP_DAYS overrides the default and bad values fall back', () => {
  assert.equal(keepDays({}), DEFAULT_KEEP_DAYS);
  assert.equal(keepDays({ TRACK_ATTEMPTS_KEEP_DAYS: '30' }), 30);
  for (const bad of ['abc', '0', '-5', '']) assert.equal(keepDays({ TRACK_ATTEMPTS_KEEP_DAYS: bad }), DEFAULT_KEEP_DAYS);
});
