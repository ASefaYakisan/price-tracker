import assert from "node:assert/strict";
import test from "node:test";
import { lookupKey } from "../src/lib/alert-lookup.ts";

const token = "0b0e6c0e-8a7c-4c1e-9f3a-2d6a5b1c9e70";

test("id + manage token finds the alert", () => {
  assert.deepEqual(lookupKey({ id: 7, token }), { id: 7, token });
});

test("item + email alone finds nothing, so no token can leak", () => {
  assert.equal(lookupKey({ productId: 3, email: "someone@example.com" } as never), null);
  assert.equal(lookupKey({ id: 7, productId: 3, email: "someone@example.com" } as never), null);
});

test("a malformed id or token finds nothing", () => {
  assert.equal(lookupKey({ id: "7", token }), null);
  assert.equal(lookupKey({ id: 7, token: "not-a-token" }), null);
  assert.equal(lookupKey({ id: 7 }), null);
  assert.equal(lookupKey(null as never), null);
});
