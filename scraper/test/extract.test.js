import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalUrl, extractProduct, parseAmount } from '../src/extract-price.js';

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
});

test('extractProduct returns null when the page has no price', () => {
  assert.equal(extractProduct('<title>Blog</title>', 'https://example.com/'), null);
});

test('canonicalUrl drops tracking params but keeps product ones', () => {
  assert.equal(canonicalUrl('https://a.com/p?id=5&utm_medium=x&gclid=1'), 'https://a.com/p?id=5');
});
