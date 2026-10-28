import assert from 'node:assert/strict';
import { test } from 'node:test';
import { budgetFromEnv, hostOf, oldestFirst, refreshLinks, summary } from '../src/refresh.js';

const link = (shop, n, extra = {}) => ({ url: `https://${shop}.example/p-${n}`, ...extra });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

test('links of different shops are read side by side, so 40 links finish well under the sequential time', async () => {
  const links = ['a', 'b', 'c', 'd'].flatMap((shop) => Array.from({ length: 10 }, (_, n) => link(shop, n)));
  const started = Date.now();
  const out = await refreshLinks(links, { read: async () => { await pause(10); return 'ok'; }, hostDelayMs: 0, concurrency: 4, batchSize: 100 });
  const sequential = 40 * 10;
  assert.equal(out.read, 40);
  assert.ok(Date.now() - started < sequential * 0.6, `took ${Date.now() - started} ms`);
});

test('reads of one shop never overlap and keep the pause between them', async () => {
  const log = [];
  let inFlight = 0;
  await refreshLinks([link('a', 1), link('a', 2), link('a', 3), link('b', 1)], {
    hostDelayMs: 40,
    read: async (l) => {
      inFlight++;
      log.push({ host: hostOf(l.url), at: Date.now(), overlap: inFlight });
      await pause(5);
      inFlight--;
    },
  });
  const a = log.filter((e) => e.host === 'a.example');
  assert.equal(a.length, 3);
  for (let i = 1; i < a.length; i++) assert.ok(a[i].at - a[i - 1].at >= 40 + 5 - 3, `gap ${a[i].at - a[i - 1].at} ms`);
  assert.ok(log.some((e) => e.host === 'b.example' && e.at - a[0].at < 30), 'another shop did not wait for the first');
});

test('results are saved in batches while the run goes on, and the rest at the end', async () => {
  const batches = [];
  const links = Array.from({ length: 7 }, (_, n) => link(`s${n}`, 1));
  await refreshLinks(links, { read: async (l) => l.url, hostDelayMs: 0, batchSize: 3, concurrency: 1, onBatch: async (b) => batches.push(b.length) });
  assert.deepEqual(batches, [3, 3, 1]);
});

test('prices already read are saved even when a later read throws', async () => {
  const saved = [];
  const links = [link('a', 1), link('b', 1), link('c', 1)];
  const out = await refreshLinks(links, {
    hostDelayMs: 0, batchSize: 1, concurrency: 1,
    read: async (l) => { if (l.url.includes('b.')) throw new Error('boom'); return l.url; },
    onBatch: async (b) => saved.push(...b.map((x) => x.result)),
  });
  assert.equal(saved.length, 2);
  assert.equal(out.failed, 1);
  assert.equal(out.read, 2);
});

test('a failing save is reported but the remaining batches are still saved', async () => {
  let calls = 0;
  const out = await refreshLinks([link('a', 1), link('b', 1), link('c', 1)], {
    hostDelayMs: 0, batchSize: 1, concurrency: 1, read: async () => 1,
    onBatch: async () => { if (++calls === 1) throw new Error('db down'); },
  });
  assert.equal(calls, 3);
  assert.equal(out.batchErrors.length, 1);
});

test('when the time budget is used up the remaining links are skipped, in order', async () => {
  let clock = 0;
  const links = Array.from({ length: 6 }, (_, n) => link(`s${n}`, 1));
  const out = await refreshLinks(links, {
    hostDelayMs: 0, concurrency: 1, budgetMs: 100, now: () => clock,
    read: async () => { clock += 40; },
  });
  assert.equal(out.read, 3); // 0, 40, 80 are inside the budget; at 120 it stops
  assert.deepEqual(out.skipped.map((l) => l.url), links.slice(3).map((l) => l.url));
  assert.match(summary(out), /3 links skipped/);
});

test('links never checked come first, then the oldest check', () => {
  const sorted = oldestFirst([
    link('a', 1, { last_checked_at: '2026-10-26T00:00:00Z' }),
    link('b', 1, { last_checked_at: null }),
    link('c', 1, { last_checked_at: '2026-10-20T00:00:00Z' }),
  ]);
  assert.deepEqual(sorted.map((l) => hostOf(l.url)), ['b.example', 'c.example', 'a.example']);
});

test('the budget comes from SCRAPE_BUDGET_MINUTES and defaults to 30', () => {
  assert.equal(budgetFromEnv({}), 30);
  assert.equal(budgetFromEnv({ SCRAPE_BUDGET_MINUTES: '12' }), 12);
  assert.equal(budgetFromEnv({ SCRAPE_BUDGET_MINUTES: 'x' }), 30);
});
