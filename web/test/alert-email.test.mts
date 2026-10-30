import assert from "node:assert/strict";
import test from "node:test";
import { accountAlertEmail } from "../src/lib/alert-email.ts";

test("the account's own address is accepted, whatever its letter case", () => {
  assert.equal(accountAlertEmail("Me@Example.com", "me@example.com"), "Me@Example.com");
  assert.equal(accountAlertEmail("me@example.com", "me@example.com"), "me@example.com");
});

test("another address is refused", () => {
  assert.equal(accountAlertEmail("me@example.com", "victim@example.org"), null);
});

test("a missing address falls back to the account's", () => {
  assert.equal(accountAlertEmail("me@example.com", ""), "me@example.com");
});

test("an account without an address keeps what was sent", () => {
  assert.equal(accountAlertEmail(null, "x@example.com"), "x@example.com");
});
