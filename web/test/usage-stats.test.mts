import assert from "node:assert/strict";
import test from "node:test";
import { isAdminEmail, linkSuccessRate } from "../src/lib/usage-stats.ts";

test("only listed emails are admins, ignoring case and spaces", () => {
  assert.equal(isAdminEmail("Me@Example.com", " me@example.com , other@example.com"), true);
  assert.equal(isAdminEmail("stranger@example.com", "me@example.com"), false);
});

test("no email or empty list -> never admin", () => {
  assert.equal(isAdminEmail(null, "me@example.com"), false);
  assert.equal(isAdminEmail("me@example.com", ""), false);
  assert.equal(isAdminEmail("me@example.com", undefined), false);
});

test("success rate is a percentage with one decimal, null without reads", () => {
  assert.equal(linkSuccessRate({ link_reads_7d: 8, link_reads_ok_7d: 7 }), 87.5);
  assert.equal(linkSuccessRate({ link_reads_7d: 0, link_reads_ok_7d: 0 }), null);
});
