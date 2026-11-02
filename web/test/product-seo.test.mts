import assert from "node:assert/strict";
import test from "node:test";
import type { ProductRow } from "../src/lib/data.ts";
import { productJsonLd, productLanguages, productSitemap } from "../src/lib/product-seo.ts";
import { LOCALE_CODES } from "../src/i18n/config.ts";

const origin = new URL("https://example.com");
const page = "https://example.com/tr/products/1";
const product: ProductRow = {
  id: 1, source: "books-toscrape", title: "A book", url: "https://shop.example/book",
  image_url: "https://shop.example/book.jpg", currency: "TRY", price: 129.9,
  previous_price: null, price_change: null, in_stock: true, scraped_at: null,
};

test("Product JSON-LD includes the observed offer, currency, source URL and image", () => {
  const data = JSON.parse(productJsonLd(product, page));
  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@type"], "Product");
  assert.equal(data.name, product.title);
  assert.equal(data.url, page);
  assert.equal(data.image, product.image_url);
  assert.deepEqual(data.offers, {
    "@type": "Offer", url: product.url, price: 129.9, priceCurrency: "TRY", availability: "https://schema.org/InStock",
  });
});

test("missing price or currency never produces an invented offer; zero is a valid price", () => {
  for (const patch of [{ price: null }, { currency: null }, { price: NaN }, { price: -1 }]) {
    assert.equal(JSON.parse(productJsonLd({ ...product, ...patch }, page)).offers, undefined);
  }
  assert.equal(JSON.parse(productJsonLd({ ...product, price: 0 }, page)).offers.price, 0);
});

test("out-of-stock and unknown stock are represented without assuming availability", () => {
  assert.equal(JSON.parse(productJsonLd({ ...product, in_stock: false }, page)).offers.availability, "https://schema.org/OutOfStock");
  assert.equal(JSON.parse(productJsonLd({ ...product, in_stock: null }, page)).offers.availability, undefined);
});

test("a closing script tag in product data is escaped and round-trips as JSON", () => {
  const title = '</script><script>alert("test")</script>';
  const json = productJsonLd({ ...product, title }, page);
  assert.ok(!json.includes("<"));
  assert.ok(json.includes("\\u003c/script>"));
  assert.equal(JSON.parse(json).name, title);
});

test("sitemap excludes custom, pending, missing and invalid products and lists 24 language alternatives", () => {
  const rows = productSitemap([null, { ...product, source: "custom" }, { ...product, price: null }, { ...product, id: NaN }, product], origin);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].url, "https://example.com/en/products/1");
  assert.deepEqual(Object.keys(rows[0].alternates!.languages!), LOCALE_CODES);
  assert.deepEqual(rows[0].alternates!.languages, productLanguages(1, origin));
  for (const lang of LOCALE_CODES) assert.equal(rows[0].alternates!.languages![lang], `https://example.com/${lang}/products/1`);
});

test("sitemap caps eligible product entries at 40,000 after filtering", () => {
  const products = Array.from({ length: 40_002 }, (_, i) => ({ ...product, id: i + 1 }));
  products[0].source = "custom";
  const rows = productSitemap(products, origin);
  assert.equal(rows.length, 40_000);
  assert.equal(rows[0].url, "https://example.com/en/products/2");
  assert.equal(rows.at(-1)!.url, "https://example.com/en/products/40001");
});
