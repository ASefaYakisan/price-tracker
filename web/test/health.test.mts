import assert from "node:assert/strict";
import test from "node:test";
import { freshness, isStale } from "../src/lib/health.ts";

const NOW = Date.parse("2026-10-29T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

test("recent reads -> ok, with the newest time per source", () => {
  const report = freshness(
    [
      { source: "tcmb", scraped_at: hoursAgo(30) },
      { source: "tcmb", scraped_at: hoursAgo(6) },
      { source: "coingecko", scraped_at: hoursAgo(5) },
    ],
    NOW,
  );
  assert.equal(report.status, "ok");
  assert.equal(report.last_scraped_at, hoursAgo(5));
  assert.deepEqual(report.sources.map((s) => [s.source, s.last_scraped_at, s.status]), [
    ["coingecko", hoursAgo(5), "ok"],
    ["tcmb", hoursAgo(6), "ok"],
  ]);
});

test("nothing read for more than 36 hours -> stale", () => {
  const report = freshness([{ source: "tcmb", scraped_at: hoursAgo(37) }], NOW);
  assert.equal(report.status, "stale");
  assert.equal(report.sources[0].status, "stale");
});

test("one old source does not make the site stale while another is fresh", () => {
  const report = freshness([{ source: "gold", scraped_at: hoursAgo(80) }, { source: "tcmb", scraped_at: hoursAgo(2) }], NOW);
  assert.equal(report.status, "ok");
  assert.equal(report.sources.find((s) => s.source === "gold")?.status, "stale");
});

test("no data -> empty", () => {
  assert.equal(freshness([], NOW).status, "empty");
  assert.equal(freshness([{ source: "tcmb", scraped_at: null }], NOW).status, "empty");
});

test("isStale ignores missing or invalid dates", () => {
  assert.equal(isStale(null, NOW), false);
  assert.equal(isStale("not a date", NOW), false);
  assert.equal(isStale(hoursAgo(36.5), NOW), true);
  assert.equal(isStale(hoursAgo(35), NOW), false);
});
