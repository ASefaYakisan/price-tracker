import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalUrl, parseAmount, readPrice } from "../src/lib/extract-price.ts";

// Same cases as scraper/test/shops.test.js, so the two extractors cannot drift apart unnoticed.
const dir = new URL("../../scraper/test/fixtures/shops/", import.meta.url);
const cases: { file: string; url: string; layer: string; expect: Record<string, unknown> }[] = JSON.parse(
  readFileSync(new URL("cases.json", dir), "utf8"),
);

for (const c of cases) {
  test(`${c.file} (${c.url}) -> ${c.layer}`, () => {
    const result = readPrice(readFileSync(new URL(c.file, dir), "utf8"), c.url);
    assert.ok(result, "no price found");
    assert.equal(result.layer, c.layer);
    assert.equal(result.product.layer, c.layer, 'product.layer feeds track_attempts');
    for (const [key, value] of Object.entries(c.expect)) assert.equal(result.product[key as keyof typeof result.product], value, key);
  });
}

test("canonicalUrl reduces Amazon links to /dp/<ASIN>", () => {
  assert.equal(canonicalUrl("https://www.amazon.de/Some-Title/dp/B0ABCDEFGH/ref=sr_1_3?keywords=x&th=1"), "https://www.amazon.de/dp/B0ABCDEFGH");
  assert.equal(canonicalUrl("https://a.com/p?id=5&utm_medium=x&gclid=1"), "https://a.com/p?id=5");
});

test("parseAmount treats a three-digit tail as decimals unless the leading group looks like thousands", () => {
  const cases: [string, number][] = [
    ["1.299", 1299],
    ["₺1.299", 1299],
    ["12,500", 12500],
    ["1.299.000", 1299000],
    ["1.299,90 TL", 1299.9],
    ["1299.900", 1299.9],
    ["0.999", 0.999],
    ["0,500", 0.5],
    ["12345,678", 12345.678],
  ];
  for (const [input, want] of cases) assert.equal(parseAmount(input), want, input);
});
