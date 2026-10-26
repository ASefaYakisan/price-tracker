import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cleanTitle, pickImage } from "../src/lib/clean-product.ts";

// Same cases as scraper/test/clean-product.test.js, so the two copies cannot drift apart unnoticed.
const cases: { titles: [string, string][]; images: { candidates: (string | null)[]; base: string; expect: string | null }[] } = JSON.parse(
  readFileSync(new URL("../../scraper/test/fixtures/clean-product-cases.json", import.meta.url), "utf8"),
);

for (const [raw, expected] of cases.titles) {
  test(`cleanTitle: ${raw}`, () => assert.equal(cleanTitle(raw), expected));
}

for (const c of cases.images) {
  test(`pickImage: ${JSON.stringify(c.candidates)}`, () => assert.equal(pickImage(c.candidates, c.base), c.expect));
}
