import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalUrl, extractProduct, parseAmount, readPrice } from '../src/extract-price.js';

test('parseAmount reads Turkish, English and plain formats', () => {
  assert.equal(parseAmount('1.299,90 TL'), 1299.9);
  assert.equal(parseAmount('$1,299.90'), 1299.9);
  assert.equal(parseAmount('₺1.299'), 1299);
  assert.equal(parseAmount('12,99'), 12.99);
  assert.equal(parseAmount('1.234.567'), 1234567);
  assert.equal(parseAmount(49.5), 49.5);
  assert.equal(parseAmount('free'), null);
  assert.equal(parseAmount('0'), null);
});

test('extractProduct prefers JSON-LD Product offers, including @graph', () => {
  const html = `<html><head><title>ignored</title>
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[
      {"@type":"BreadcrumbList"},
      {"@type":"Product","name":"Kahve Makinesi","image":["/img/k.jpg"],
       "offers":{"@type":"Offer","price":"2.499,00","priceCurrency":"TRY","availability":"https://schema.org/OutOfStock"}}]}
    </script></head></html>`;
  const p = extractProduct(html, 'https://shop.example/p/kahve?utm_source=x#reviews');
  assert.deepEqual(p, {
    external_id: 'https://shop.example/p/kahve',
    title: 'Kahve Makinesi',
    url: 'https://shop.example/p/kahve?utm_source=x#reviews',
    image_url: 'https://shop.example/img/k.jpg',
    price: 2499,
    currency: 'TRY',
    in_stock: false,
    rating: null,
    layer: 'json-ld',
  });
});

test('extractProduct falls back to price meta tags', () => {
  const html = `<meta property="og:title" content="Desk Lamp">
    <meta property="product:price:amount" content="39.99">
    <meta property="product:price:currency" content="usd">`;
  const p = extractProduct(html, 'https://shop.example/lamp');
  assert.equal(p.title, 'Desk Lamp');
  assert.equal(p.price, 39.99);
  assert.equal(p.currency, 'USD');
  assert.equal(p.in_stock, true);
  assert.equal(p.layer, 'meta');
});

test('extractProduct reports microdata when only itemprop holds the price', () => {
  const html = `<h1>Mug</h1><span itemprop="price" content="12.50"></span><meta itemprop="priceCurrency" content="EUR">`;
  const p = extractProduct(html, 'https://shop.example/mug');
  assert.equal(p.price, 12.5);
  assert.equal(p.layer, 'microdata');
});

test('extractProduct returns null when the page has no price', () => {
  assert.equal(extractProduct('<title>Blog</title>', 'https://example.com/'), null);
});

test('canonicalUrl drops tracking params but keeps product ones', () => {
  assert.equal(canonicalUrl('https://a.com/p?id=5&utm_medium=x&gclid=1'), 'https://a.com/p?id=5');
});

test('canonicalUrl reduces Amazon links to /dp/<ASIN>', () => {
  assert.equal(
    canonicalUrl('https://www.amazon.de/Some-Title/dp/B0ABCDEFGH/ref=sr_1_3?keywords=x&qid=1&th=1&psc=1'),
    'https://www.amazon.de/dp/B0ABCDEFGH',
  );
  assert.equal(canonicalUrl('https://www.amazon.com/gp/product/B012345678?th=1'), 'https://www.amazon.com/dp/B012345678');
  assert.equal(canonicalUrl('https://www.amazon.com/s?k=lamp&ref=nb'), 'https://www.amazon.com/s?k=lamp');
});

test('readPrice uses the first layer that finds a price and reports it', () => {
  const html = `<script type="application/ld+json">{"@type":"Product","name":"A","offers":{"price":"10.00"}}</script>
    <span itemprop="price">12,00</span><meta property="product:price:amount" content="14">`;
  assert.equal(readPrice(html, 'https://shop.example/a').layer, 'json-ld');
  assert.equal(readPrice(html, 'https://shop.example/a').product.price, 10);
  assert.equal(readPrice('<meta property="og:price:amount" content="14">', 'https://shop.example/a').layer, 'meta');
});

test('shop adapters only run on their own shop', () => {
  const html = '<span id="productTitle">Lamp</span><div id="corePrice_feature_div"><span class="a-price"><span class="a-offscreen">$25.00</span></span></div>';
  assert.equal(readPrice(html, 'https://www.amazon.com/dp/B012345678').product.currency, 'USD');
  assert.equal(readPrice(html, 'https://not-amazon.example/dp/B012345678'), null);
});

test('embedded state ignores unparseable scripts and price ranges', () => {
  const html = `<script>window.__INITIAL_STATE__ = {"broken": </script>
    <script id="__NEXT_DATA__" type="application/json">{"props":{"filters":{"price":"100-500"}}}</script>`;
  assert.equal(readPrice(html, 'https://shop.example/x'), null);
});
