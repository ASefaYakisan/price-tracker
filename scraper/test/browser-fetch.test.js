import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createBrowserReader, productFromDom, worthBrowserRetry } from '../src/browser-fetch.js';

// Pages that only show a price once their scripts run, as many shops do.
const PAGES = {
  '/ld': `<html><head><title>Shell</title><script>
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({ '@type': 'Product', name: 'Kahve Makinesi', offers: { price: '2499.90', priceCurrency: 'TRY' } });
    document.head.appendChild(ld);
  </script></head><body></body></html>`,
  '/dom': `<html><head><title>Kulaklık | Mağaza</title></head><body><h1>Kulaklık</h1>
    <div id="app"></div>
    <script>
      setTimeout(() => {
        document.getElementById('app').innerHTML =
          '<span class="old-price" style="text-decoration: line-through">1.999,00 TL</span>' +
          '<span class="product-price">1.499,00 TL</span>';
      }, 50);
    </script></body></html>`,
  '/empty': '<html><head><title>Nothing</title></head><body>Hello</body></html>',
};

let server;
let base;
let hasBrowser = true;
try {
  const { chromium } = await import('playwright');
  const { existsSync } = await import('node:fs');
  hasBrowser = existsSync(chromium.executablePath());
} catch {
  hasBrowser = false;
}
const needsBrowser = { skip: !hasBrowser && 'Chromium is not installed (npx playwright install chromium)', timeout: 60_000 };

before(async () => {
  server = createServer((req, res) => {
    const body = PAGES[req.url];
    res.writeHead(body ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body ?? 'not found');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test('a missing page or a price already read is not retried in the browser', () => {
  assert.equal(worthBrowserRetry({ outcome: 'ok', product: { price: 1 } }), false);
  assert.equal(worthBrowserRetry({ outcome: 'http_error', httpStatus: 404 }), false);
  assert.equal(worthBrowserRetry({ outcome: 'http_error', httpStatus: 410 }), false);
  assert.equal(worthBrowserRetry({ outcome: 'http_error', httpStatus: 403 }), true);
  assert.equal(worthBrowserRetry({ outcome: 'no_price', httpStatus: 200 }), true);
  assert.equal(worthBrowserRetry({ outcome: 'timeout' }), true);
});

test('without a browser the plain-request result stands', async () => {
  let launches = 0;
  const reader = createBrowserReader({ launch: async () => { launches++; throw new Error('no chromium'); } });
  const plain = { outcome: 'http_error', httpStatus: 403, html: null, product: null };
  assert.equal(await reader.retry('https://shop.example/a', plain), plain);
  assert.equal(await reader.retry('https://shop.example/b', plain), plain);
  assert.equal(launches, 1);
  await reader.close();
});

test('a browser error keeps the plain result and the retry cap keeps a run short', async () => {
  let pages = 0;
  const fakeBrowser = {
    newContext: async () => { pages++; throw new Error('stop here'); },
    close: async () => {},
  };
  const reader = createBrowserReader({ maxPages: 1, launch: async () => fakeBrowser });
  const plain = { outcome: 'no_price', httpStatus: 200, html: '<html></html>', product: null };
  assert.equal(await reader.retry('https://shop.example/a', plain), plain);
  assert.equal(await reader.retry('https://shop.example/b', plain), plain);
  assert.equal(pages, 1);
});

test('productFromDom reads the amount and currency from the price text', () => {
  const product = productFromDom({ price: '1.499,00 TL', title: 'Kulaklık', image: '/k.jpg' }, 'https://shop.example/k?utm_source=x');
  assert.equal(product.price, 1499);
  assert.equal(product.currency, 'TRY');
  assert.equal(product.external_id, 'https://shop.example/k');
  assert.equal(product.image_url, 'https://shop.example/k.jpg');
  assert.equal(product.layer, 'browser/dom');
  assert.equal(productFromDom({ price: null, title: 'x' }, 'https://shop.example/k'), null);
});

test('structured data written by scripts is read from the rendered page', needsBrowser, async () => {
  const reader = createBrowserReader();
  try {
    const attempt = await reader.retry(`${base}/ld`, { outcome: 'no_price', httpStatus: 200, html: '<html></html>', product: null });
    assert.equal(attempt.outcome, 'ok');
    assert.equal(attempt.product.price, 2499.9);
    assert.equal(attempt.product.title, 'Kahve Makinesi');
    assert.equal(attempt.product.layer, 'browser/json-ld');
    assert.equal(attempt.product.external_id, `${base}/ld`);
  } finally {
    await reader.close();
  }
});

test('a price drawn into the page is read, skipping the crossed-out old price', needsBrowser, async () => {
  const reader = createBrowserReader();
  try {
    const attempt = await reader.retry(`${base}/dom`, { outcome: 'http_error', httpStatus: 403, html: null, product: null });
    assert.equal(attempt.outcome, 'ok');
    assert.equal(attempt.product.price, 1499);
    assert.equal(attempt.product.currency, 'TRY');
    assert.equal(attempt.product.title, 'Kulaklık');
    assert.equal(attempt.layer, 'browser/dom');

    const missing = await reader.retry(`${base}/empty`, { outcome: 'http_error', httpStatus: 403, html: null, product: null });
    assert.equal(missing.outcome, 'no_price');
    const gone = await reader.retry(`${base}/gone`, { outcome: 'timeout', html: null, product: null });
    assert.equal(gone.outcome, 'http_error');
    assert.equal(gone.httpStatus, 404);
  } finally {
    await reader.close();
  }
});
