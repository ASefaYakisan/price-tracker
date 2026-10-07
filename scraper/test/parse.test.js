import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseListing, parsePrice } from '../src/adapters/books-toscrape.js';

const pageUrl = 'https://books.toscrape.com/catalogue/page-1.html';

test('parses product cards and next page link', async () => {
  const html = await readFile(new URL('./fixtures/books-page-1.html', import.meta.url), 'utf8');
  const { products, nextUrl } = parseListing(html, pageUrl);

  assert.equal(products.length, 2);
  assert.deepEqual(products[0], {
    external_id: 'a-light-in-the-attic_1000',
    title: 'A Light in the Attic',
    url: 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
    image_url: 'https://books.toscrape.com/media/cache/2c/da/2cdad67c44b002e7ead0cc35693c0e8b.jpg',
    price: 51.77,
    currency: 'GBP',
    in_stock: true,
    rating: 3,
  });
  assert.equal(products[1].in_stock, false);
  assert.equal(products[1].rating, 1);
  assert.equal(nextUrl, 'https://books.toscrape.com/catalogue/page-2.html');
});

test('parsePrice handles symbols and comma decimals', () => {
  assert.equal(parsePrice('£51.77'), 51.77);
  assert.equal(parsePrice('1299,90 TL'), 1299.9);
  assert.equal(parsePrice('n/a'), null);
});
