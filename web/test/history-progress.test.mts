import { test } from "node:test";
import assert from "node:assert/strict";
import { historyDay } from "../src/lib/history-progress.ts";

const start = Date.parse("2026-10-01T10:00:00Z");
const DAY = 86_400_000;

test("day 1 when tracking just started", () => {
  assert.equal(historyDay(start, start), 1);
  assert.equal(historyDay(new Date(start).toISOString(), start + 3_600_000), 1);
});

test("counts whole days since the first reading", () => {
  assert.equal(historyDay(start, start + DAY), 2);
  assert.equal(historyDay(start, start + 6 * DAY), 7);
});

test("null once a week of history exists, or for a bad date", () => {
  assert.equal(historyDay(start, start + 7 * DAY), null);
  assert.equal(historyDay("nope", start), null);
});

test("a first reading in the future still counts as day 1", () => {
  assert.equal(historyDay(start + DAY, start), 1);
});
