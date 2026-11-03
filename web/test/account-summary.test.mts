import test from "node:test";
import assert from "node:assert/strict";
import { ALERTS_PER_ACCOUNT, buildSummary, usedPercent } from "../src/lib/account-summary.ts";

test("buildSummary treats failed counts as zero and carries the limits", () => {
  const s = buildSummary({ listed: 3, alertsActive: null, alertsTotal: 5, ownedLinks: 12, recentLinks: -1 });
  assert.equal(s.alertsActive, 0);
  assert.equal(s.linksHour.used, 0);
  assert.deepEqual(s.alerts, { used: 5, max: ALERTS_PER_ACCOUNT });
  assert.equal(s.links.used, 12);
});

test("usedPercent is capped at 100", () => {
  assert.equal(usedPercent({ used: 15, max: 30 }), 50);
  assert.equal(usedPercent({ used: 99, max: 30 }), 100);
  assert.equal(usedPercent({ used: 1, max: 0 }), 0);
});
