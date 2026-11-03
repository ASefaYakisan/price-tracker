import assert from "node:assert/strict";
import { test } from "node:test";
import { apiUrl, countryFor, fetchViaApi, monthlyLimit } from "../src/lib/unblock.ts";

const db = (all: number, plus = 0) => ({
  from: () => {
    let like = "";
    const q: Record<string, unknown> = {
      select: () => q,
      like: (_c: string, v: string) => ((like = v), q),
      gte: () => Promise.resolve({ count: like.includes("plus") ? plus : all, error: null }),
    };
    return q;
  },
}) as never;

test("country follows the shop's domain", () => {
  assert.equal(countryFor("www.trendyol.com"), "tr");
  assert.equal(countryFor("www.amazon.de"), "de");
  assert.equal(countryFor("www.amazon.co.uk"), "uk");
  assert.equal(countryFor("www.ebay.com"), "us");
  assert.equal(countryFor("www.walmart.com"), "us");
  assert.equal(countryFor("www.zalando.de"), "de");
  assert.equal(countryFor("www.example.zz"), null);
});

test("apiUrl carries the key, the page and the country", () => {
  const u = new URL(apiUrl("K", "https://a.com/p?x=1", "tr"));
  assert.equal(u.searchParams.get("api_key"), "K");
  assert.equal(u.searchParams.get("url"), "https://a.com/p?x=1");
  assert.equal(u.searchParams.get("country_code"), "tr");
});

test("monthly limit defaults to 900 and ignores bad values", () => {
  assert.equal(monthlyLimit({}), 900);
  assert.equal(monthlyLimit({ UNBLOCK_MONTHLY_LIMIT: "x" }), 900);
  assert.equal(monthlyLimit({ UNBLOCK_MONTHLY_LIMIT: "50" }), 50);
});

test("off without a key: nothing is fetched", async () => {
  let called = false;
  const out = await fetchViaApi("https://a.com/p", db(0), {}, (async () => ((called = true), new Response("x"))) as never);
  assert.equal(out, null);
  assert.equal(called, false);
});

test("returns the page when the key is set and credits remain", async () => {
  const out = await fetchViaApi("https://a.com.tr/p", db(3), { SCRAPER_API_KEY: "K" }, (async () => new Response("<html>ok</html>")) as never);
  assert.equal(out, "<html>ok</html>");
});

test("stops when the monthly limit is used up (rendered reads count 10)", async () => {
  let called = false;
  const out = await fetchViaApi("https://a.com/p", db(100, 90), { SCRAPER_API_KEY: "K" }, (async () => ((called = true), new Response("x"))) as never);
  assert.equal(out, null);
  assert.equal(called, false);
});

test("a failed API read returns null instead of throwing", async () => {
  const out = await fetchViaApi("https://a.com/p", db(0), { SCRAPER_API_KEY: "K" }, (async () => new Response("no", { status: 500 })) as never);
  assert.equal(out, null);
});
