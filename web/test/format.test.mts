import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
import en from "../src/i18n/dictionaries/en.ts";

// Node does not resolve Next's @ alias; keep application imports unchanged.
register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "@/i18n/config"
      ? ${JSON.stringify(new URL("../src/i18n/config.ts", import.meta.url).href)}
      : specifier, context);
  }
`)}`, import.meta.url);
const { money, axisMoney, percentChange, percent, riseIsGood, changeTone, storeName, sourceLabel } = await import("../src/lib/format.ts");

test("money handles absent, zero, fractional and small prices", () => {
  assert.equal(money(null, null), "–");
  assert.equal(money(undefined, null), "–");
  assert.match(money(0, "USD"), /0\.00/);
  assert.match(money(1.5, "USD"), /1\.50/);
  assert.match(money(0.00001234, "USD"), /0\.00001234/);
  assert.equal(money(1.5, null), money(1.5, "USD"));
  assert.match(money(1234.5, "USD", "en"), /1,234\.50/);
  assert.match(money(1234.5, "USD", "tr"), /1\.234,50/);
  assert.match(money(1.5, "USD"), /\$/);
});

test("axis labels switch to compact notation at ten thousand", () => {
  for (const n of [0, 1.5, 9999, -9999]) assert.equal(axisMoney(n, "USD"), money(n, "USD"));
  for (const n of [10000, -10000, 12000]) {
    assert.match(axisMoney(n, "USD"), /k/i);
    assert.ok(axisMoney(n, "USD").length < money(n, "USD").length);
  }
});

test("percentage changes handle missing and zero baselines", () => {
  assert.equal(percentChange(null, 100), null);
  assert.equal(percentChange(100, null), null);
  assert.equal(percentChange(100, 0), null);
  assert.equal(percentChange(125, 100), 25);
  assert.equal(percentChange(75, 100), -25);
  assert.equal(percentChange(100, 100), 0);
});

test("percent respects locale and optional signs", () => {
  for (const lang of ["en", "tr"] as const) {
    assert.match(percent(1.5, lang), /\+/);
    assert.match(percent(-1.5, lang), /-/);
    assert.match(percent(1.5, lang), /%/);
    assert.doesNotMatch(percent(-1.5, lang, false), /[+-]/);
    assert.doesNotMatch(percent(0, lang), /[+-]/);
  }
  assert.match(percent(1.5, "en"), /1\.5/);
  assert.match(percent(1.5, "tr"), /1,5/);
});

test("market rises are good and shop drops are good", () => {
  for (const source of ["coingecko", "tcmb", "gold"]) {
    assert.equal(riseIsGood(source), true);
    assert.equal(changeTone(1, source), "good");
    assert.equal(changeTone(-1, source), "bad");
  }
  for (const source of ["custom", "books", "unknown"]) {
    assert.equal(riseIsGood(source), false);
    assert.equal(changeTone(1, source), "bad");
    assert.equal(changeTone(-1, source), "good");
  }
});

test("store labels use the host or fall back to the source", () => {
  assert.equal(storeName({ source: "custom", url: "https://www.shop.example/product" }, en), "shop.example");
  assert.equal(storeName({ source: "custom", url: "invalid" }, en), en.sources.custom);
  assert.equal(storeName({ source: "coingecko", url: "invalid" }, en), en.sources.coingecko);
  assert.equal(sourceLabel("unknown", en), "unknown");
});
