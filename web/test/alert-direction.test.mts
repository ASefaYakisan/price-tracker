import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { alertProgress, directionOf, isReached, parseDirection, suggestedTarget } from "../src/lib/alert-direction.ts";

test("parseDirection defaults to below and rejects unknown values", () => {
  for (const missing of [undefined, null, ""]) assert.equal(parseDirection(missing), "below");
  assert.equal(parseDirection("below"), "below");
  assert.equal(parseDirection("above"), "above");
  for (const bad of ["up", "ABOVE", 1, true, {}]) assert.equal(parseDirection(bad), null);
});

test("directionOf treats rows without the column as below", () => {
  assert.equal(directionOf(undefined), "below");
  assert.equal(directionOf(null), "below");
  assert.equal(directionOf("above"), "above");
});

test("isReached: above fires at or over the target, below at or under it", () => {
  assert.equal(isReached(125000, 125000, "above"), true);
  assert.equal(isReached(124999, 125000, "above"), false);
  assert.equal(isReached(100, 90, "below"), false);
  assert.equal(isReached(90, 90, "below"), true);
  assert.equal(isReached(null, 90, "above"), false);
});

test("suggestedTarget starts 5% below or above today's price", () => {
  assert.equal(suggestedTarget(100, "below"), "95");
  assert.equal(suggestedTarget(100, "above"), "105");
  assert.equal(suggestedTarget(null, "above"), "");
});

test("alertProgress fills up as the price nears the target from either side", () => {
  assert.equal(alertProgress(100, 50, "below"), 0.5);
  assert.equal(alertProgress(50, 100, "above"), 0.5);
  assert.equal(alertProgress(120, 100, "above"), 1);
  assert.equal(alertProgress(null, 100, "above"), 0);
});

test("migration 0014 adds a direction column that keeps old alerts as below", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/0014_alert_direction.sql", import.meta.url), "utf8");
  assert.match(sql, /add column if not exists direction text not null default 'below'/);
  assert.match(sql, /check \(direction in \('below', 'above'\)\)/);
  assert.doesNotMatch(sql, /\bdrop\b|\bdelete\b/i);
});
