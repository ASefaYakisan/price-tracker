import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readLink } from '../src/adapters/custom.js';
import { fetchText } from '../src/fetch.js';
import { MAX_BODY_BYTES, isPageType, readCapped } from '../src/read-body.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const PUBLIC = { resolve: async () => ['93.184.216.34'] };
const guard = async () => {};

// A body of `total` bytes sent in 64 KB chunks that records whether the reader gave up early.
function bigResponse(total, contentType = 'text/html') {
  const state = { sent: 0, cancelled: false };
  const body = new ReadableStream({
    pull(controller) {
      if (state.sent >= total) return controller.close();
      const size = Math.min(65_536, total - state.sent);
      state.sent += size;
      controller.enqueue(new Uint8Array(size).fill(97));
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return { state, res: new Response(body, { status: 200, headers: { 'content-type': contentType } }) };
}

test('isPageType accepts HTML and JSON, rejects files', () => {
  for (const type of ['text/html; charset=utf-8', 'application/xhtml+xml', 'application/json', 'application/ld+json', null, '']) {
    assert.equal(isPageType(type), true, String(type));
  }
  for (const type of ['application/pdf', 'video/mp4', 'application/octet-stream', 'image/png', 'application/zip']) {
    assert.equal(isPageType(type), false, type);
  }
});

test('readCapped stops a 10 MB stream at the cap and cancels it', async () => {
  const { state, res } = bigResponse(10_000_000);
  const text = await readCapped(res);
  assert.equal(text.length, MAX_BODY_BYTES);
  assert.equal(state.cancelled, true);
  assert.ok(state.sent < 10_000_000, `read ${state.sent} bytes`);
});

test('readCapped returns a normal page unchanged, multi-byte text included', async () => {
  const html = '<html><body><h1>Fiyat: 1.299,90 ₺ — Türkçe ürün</h1></body></html>';
  assert.equal(await readCapped(new Response(html)), html);
});

test('fetchText with a guard refuses a PDF without reading it', async () => {
  const { state, res } = bigResponse(10_000_000, 'application/pdf');
  globalThis.fetch = async () => res;
  await assert.rejects(fetchText('https://shop.example/manual.pdf', { guard, retries: 1 }), (err) => err.notPage === true);
  assert.equal(state.cancelled, true);
  assert.ok(state.sent < 1_000_000);
});

test('fetchText without a guard (fixed feeds) does not check the content type', async () => {
  globalThis.fetch = async () => new Response('<rates/>', { headers: { 'content-type': 'application/xml' } });
  assert.equal(await fetchText('https://feed.example/rates.xml', { retries: 1 }), '<rates/>');
});

test('readLink reports a PDF link as no_price', async () => {
  const { res } = bigResponse(5_000_000, 'application/pdf');
  globalThis.fetch = async () => res;
  const attempt = await readLink('https://shop.example/manual.pdf', { retries: 1, guard });
  assert.equal(attempt.outcome, 'no_price');
  assert.equal(attempt.product, null);
});

test('readLink still reads a price from a normal page', async () => {
  const html = '<html><head><script type="application/ld+json">{"@type":"Product","name":"Kettle","offers":{"@type":"Offer","price":"49.90","priceCurrency":"USD"}}</script></head></html>';
  globalThis.fetch = async () => new Response(html, { headers: { 'content-type': 'text/html' } });
  const attempt = await readLink('https://shop.example/kettle', { retries: 1, guard });
  assert.equal(attempt.outcome, 'ok');
  assert.equal(attempt.product.price, 49.9);
});
