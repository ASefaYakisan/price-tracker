import assert from "node:assert/strict";
import test from "node:test";
import { defaultList, itemsInList, sharedListOf, shouldDropProduct } from "../src/lib/lists.ts";

const items = [
  { id: 1, source: "custom" },
  { id: 2, source: "custom" },
  { id: 3, source: "coingecko" },
  { id: 4, source: "tcmb" },
  { id: 5, source: "gold" },
  { id: 6, source: "books-toscrape" },
];
const ids = (list: { id: number }[]) => list.map((p) => p.id);

test("only built-in sources are shared; pasted links are never in a shared list", () => {
  assert.equal(sharedListOf("custom"), null);
  assert.equal(sharedListOf("coingecko"), "markets");
  assert.equal(sharedListOf("books-toscrape"), "sample");
  assert.deepEqual(ids(itemsInList(items, "markets", null)), [3, 4, 5]);
  assert.deepEqual(ids(itemsInList(items, "sample", null)), [6]);
});

test("my list is exactly the items passed in, empty while unknown", () => {
  assert.deepEqual(ids(itemsInList(items, "mine", [items[1], items[2]])), [2, 3]);
  assert.deepEqual(ids(itemsInList(items, "mine", null)), []);
});

test("signed-in visitors start on their list; others on the markets", () => {
  assert.equal(defaultList(true), "mine");
  assert.equal(defaultList(false), "markets");
});

test("a link is dropped only when nobody follows it and it has no alerts", () => {
  assert.equal(shouldDropProduct({ source: "custom", followers: 0, alerts: 0 }), true);
  assert.equal(shouldDropProduct({ source: "custom", followers: 1, alerts: 0 }), false);
  assert.equal(shouldDropProduct({ source: "custom", followers: 0, alerts: 2 }), false);
  assert.equal(shouldDropProduct({ source: "coingecko", followers: 0, alerts: 0 }), false);
  // A count that failed never deletes anything.
  assert.equal(shouldDropProduct({ source: "custom", followers: null, alerts: 0 }), false);
  assert.equal(shouldDropProduct({ source: "custom", followers: 0, alerts: null }), false);
});
