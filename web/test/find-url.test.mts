import assert from "node:assert/strict";
import test from "node:test";
import { findUrl } from "../src/lib/find-url.ts";

const cases: [string, string | null][] = [
  ["https://www.trendyol.com/apple/iphone-p-123", "https://www.trendyol.com/apple/iphone-p-123"],
  ["  https://www.hepsiburada.com/x-p-HBCV00007MIF54  ", "https://www.hepsiburada.com/x-p-HBCV00007MIF54"],
  // Trendyol app: "Paylaş"
  ["Bu ürüne bak! https://ty.gl/abc123", "https://ty.gl/abc123"],
  // Hepsiburada app
  ["Hepsiburada'da bu ürünü gördün mü? Samsung Galaxy S25 Ultra https://app.hb.biz/AbCdEf", "https://app.hb.biz/AbCdEf"],
  // Amazon app: title, then the short link
  ["Amazon.com.tr: Logitech MX Master 3S Kablosuz Mouse\nhttps://amzn.eu/d/9xYzAbC", "https://amzn.eu/d/9xYzAbC"],
  ["Look at this (https://www.amazon.com/dp/B0D1XD1ZV3).", "https://www.amazon.com/dp/B0D1XD1ZV3"],
  ["https://en.wikipedia.org/wiki/Foo_(bar)", "https://en.wikipedia.org/wiki/Foo_(bar)"],
  ["https://www.n11.com/urun/abc?magaza=x&utm_source=share, ucuz!", "https://www.n11.com/urun/abc?magaza=x&utm_source=share"],
  ["www.trendyol.com/apple/iphone-p-123", "https://www.trendyol.com/apple/iphone-p-123"],
  ["trendyol.com/apple/iphone-p-123", "https://trendyol.com/apple/iphone-p-123"],
  ["see www.vatanbilgisayar.com.", "https://www.vatanbilgisayar.com"],
  ["HTTP://EXAMPLE.COM/A", "HTTP://EXAMPLE.COM/A"],
  ["iphone 16 pro", null],
  ["e.g. the cheapest one", null],
  ["", null],
];

for (const [text, expected] of cases) {
  test(`findUrl(${JSON.stringify(text)})`, () => assert.equal(findUrl(text), expected));
}
