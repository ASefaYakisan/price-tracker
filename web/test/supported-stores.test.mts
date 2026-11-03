import { test } from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_STORES, STORES_TESTED_ON } from "../src/lib/supported-stores.ts";

test("every tested store has a name, a plain domain and a valid status", () => {
  for (const s of SUPPORTED_STORES) {
    assert.ok(s.name.trim().length > 0);
    assert.match(s.domain, /^[a-z0-9-]+(\.[a-z0-9-]+)+$/);
    assert.ok(s.status === "works" || s.status === "limited");
  }
  assert.equal(new Set(SUPPORTED_STORES.map((s) => s.domain)).size, SUPPORTED_STORES.length);
});

test("at least 10 stores are readable and unreadable ones are marked limited", () => {
  assert.ok(SUPPORTED_STORES.filter((s) => s.status === "works").length >= 10);
  for (const name of ["n11", "Decathlon"]) {
    assert.equal(SUPPORTED_STORES.find((s) => s.name === name)?.status, "limited");
  }
  assert.match(STORES_TESTED_ON, /^\d{4}-\d{2}-\d{2}$/);
});

test("every store has a region and the foreign shops that were read are listed", () => {
  for (const s of SUPPORTED_STORES) assert.ok(s.region === "turkey" || s.region === "international");
  for (const domain of ["amazon.com", "ebay.com", "ikea.com"]) {
    assert.equal(SUPPORTED_STORES.find((s) => s.domain === domain)?.region, "international");
  }
});
