import assert from "node:assert/strict";
import test from "node:test";
import { ATTEMPTS_PER_HOUR, LINKS_PER_ACCOUNT, LINKS_PER_HOUR, trackLimitMessage } from "../src/lib/track-limits.ts";

const none = { recentLinks: 0, ownedLinks: 0, recentAttempts: 0 };

test("under every limit -> allowed", () => {
  assert.equal(trackLimitMessage({ recentLinks: LINKS_PER_HOUR - 1, ownedLinks: LINKS_PER_ACCOUNT - 1, recentAttempts: ATTEMPTS_PER_HOUR - 1 }), null);
});

test("failed attempts alone hit the hourly limit", () => {
  assert.match(trackLimitMessage({ ...none, recentAttempts: ATTEMPTS_PER_HOUR }) ?? "", /last hour/);
});

test("saved links hit the hourly and account limits", () => {
  assert.match(trackLimitMessage({ ...none, recentLinks: LINKS_PER_HOUR }) ?? "", /last hour/);
  assert.match(trackLimitMessage({ ...none, ownedLinks: LINKS_PER_ACCOUNT }) ?? "", /maximum/);
});

test("a count that failed does not block", () => {
  assert.equal(trackLimitMessage({ recentLinks: null, ownedLinks: null, recentAttempts: null }), null);
});
