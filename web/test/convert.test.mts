import assert from "node:assert/strict";
import test from "node:test";
const { ratesFromProducts, convertPrice } = await import("../src/lib/convert.ts");

const rows = [
  { source: "tcmb", title: "US Dollar (USD/TRY)", price: 40 },
  { source: "tcmb", title: "Euro (EUR/TRY)", price: 50 },
  { source: "coingecko", title: "Bitcoin (BTC/TRY)", price: 9 },
  { source: "tcmb", title: "Broken", price: 3 },
  { source: "tcmb", title: "Swiss Franc (CHF/TRY)", price: null },
];

test("ratesFromProducts reads only central-bank rows with a price", () => {
  assert.deepEqual(ratesFromProducts(rows), { TRY: 1, USD: 40, EUR: 50 });
});

test("convertPrice goes through the lira", () => {
  const rates = ratesFromProducts(rows);
  assert.equal(convertPrice(100, "EUR", "USD", rates), 125);
  assert.equal(convertPrice(100, "USD", "TRY", rates), 4000);
  assert.equal(convertPrice(4000, "TRY", "USD", rates), 100);
  assert.equal(convertPrice(1, null, "TRY", rates), 40);
  assert.equal(convertPrice(1, "GBP", "USD", rates), null);
});
