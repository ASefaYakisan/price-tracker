import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyPoints } from '../src/backfill.js';

test('backfill: keeps one point per day and nothing from the first real scrape on', () => {
  const day = (d, h) => Date.UTC(2026, 9, d, h);
  const points = dailyPoints(
    [
      [day(1, 3), 10],
      [day(1, 20), 11],
      [day(2, 5), 12],
      [day(3, 5), 13],
    ],
    day(3, 0),
  );
  assert.deepEqual(points, [
    { scraped_at: '2026-10-01T20:00:00.000Z', price: 11 },
    { scraped_at: '2026-10-02T05:00:00.000Z', price: 12 },
  ]);
});

test('backfill: rejects an unexpected response', () => {
  assert.throws(() => dailyPoints(undefined, 0));
});
