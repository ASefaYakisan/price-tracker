import test from "node:test";
import assert from "node:assert/strict";
import { changeCounts } from "../src/lib/change-counts.ts";

test("counts two drops and one rise", () => {
  const items = [
    { price: 90, previous_price: 100 },
    { price: 8, previous_price: 10 },
    { price: 12, previous_price: 10 },
  ];
  assert.deepEqual(changeCounts(items), { drops: 2, rises: 1 });
});

test("unchanged, single-reading and pending products count as neither", () => {
  const items = [
    { price: 10, previous_price: 10 },
    { price: 10, previous_price: null },
    { price: null, previous_price: null },
    { price: 10.0001, previous_price: 10 },
  ];
  assert.deepEqual(changeCounts(items), { drops: 0, rises: 0 });
});

import { cardTones } from "../src/lib/change-counts.ts";

const marketSource = (s: string) => s === "coingecko" || s === "gold";

test("shop lists: drops are good, rises are bad", () => {
  assert.deepEqual(cardTones([{ source: "custom" }], marketSource), { drops: "good", rises: "bad" });
});

test("market lists: rises are good, drops are bad", () => {
  assert.deepEqual(cardTones([{ source: "coingecko" }, { source: "gold" }], marketSource), { drops: "bad", rises: "good" });
});

test("mixed and empty lists stay neutral", () => {
  const neutral = { drops: "neutral", rises: "neutral" };
  assert.deepEqual(cardTones([{ source: "coingecko" }, { source: "custom" }], marketSource), neutral);
  assert.deepEqual(cardTones([], marketSource), neutral);
});
