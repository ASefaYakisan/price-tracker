import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readThroughLayers as readLink } from '../src/adapters/custom.js';
import { apiUrl, createUnblocker, isListed, unblockConfig } from '../src/unblock-fetch.js';

const PAGE = `<html><head><script type="application/ld+json">
{"@type":"Product","name":"Kulaklık","offers":{"@type":"Offer","price":"1299.90","priceCurrency":"TRY"}}
</script></head></html>`;
const LINK = 'https://www.shop.example/kulaklik-p-1';
const KEY = 'secret-key';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// The shop answers with `shopStatus`; anything sent to the API gets `apiStatus` (and PAGE when 200).
function fakeNetwork({ shopStatus = 403, apiStatus = 200, shopPage = null } = {}) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const toApi = String(url).startsWith('https://api.scraperapi.com/');
    calls.push(toApi ? 'api' : 'shop');
    const status = toApi ? apiStatus : shopStatus;
    const body = !toApi && shopPage ? shopPage : status === 200 ? PAGE : 'blocked';
    return new Response(body, { status });
  };
  return calls;
}

// Only answers the monthly count queries: `used` plain reads, `rendered` of them rendered.
function fakeDb(used = 0, rendered = 0) {
  return {
    from: () => {
      let prefix = '';
      const query = {
        select: () => query,
        like: (_column, pattern) => ((prefix = pattern), query),
        gte: () => query,
        then: (resolve) => resolve({ count: prefix.startsWith('unblock-render') ? rendered : used, error: null }),
      };
      return query;
    },
  };
}

const env = (extra = {}) => ({ SCRAPER_API_KEY: KEY, ...extra });

// Stands in for browser-fetch.js: answers every retry with `result` and counts the calls.
function fakeBrowser(result) {
  const browser = {
    calls: 0,
    async retry(url, attempt) {
      browser.calls += 1;
      return result ?? attempt;
    },
  };
  return browser;
}

test('without a key the layer is off and a blocked link fails as before', async () => {
  assert.equal(createUnblocker({ db: fakeDb(), env: {} }), null);
  const calls = fakeNetwork();
  const attempt = await readLink(LINK, { retries: 1, unblocker: null });
  assert.equal(attempt.outcome, 'http_error');
  assert.equal(attempt.httpStatus, 403);
  assert.equal(attempt.layer, null);
  assert.deepEqual(calls, ['shop']);
});

test('a 403 from the shop is retried through the API and the price is read', async () => {
  const calls = fakeNetwork();
  const unblocker = createUnblocker({ db: fakeDb(), env: env() });
  const attempt = await readLink(LINK, { retries: 1, unblocker });
  assert.deepEqual(calls, ['shop', 'api']);
  assert.equal(attempt.outcome, 'ok');
  assert.equal(attempt.layer, 'unblock:json-ld');
  assert.equal(attempt.product.price, 1299.9);
});

test('a page the shop serves is not sent to the API', async () => {
  const calls = fakeNetwork({ shopStatus: 200 });
  const attempt = await readLink(LINK, { retries: 1, unblocker: createUnblocker({ db: fakeDb(), env: env() }) });
  assert.deepEqual(calls, ['shop']);
  assert.equal(attempt.layer, 'json-ld');
});

test('a robot-check page served with 200 counts as blocked and goes to the API', async () => {
  const calls = fakeNetwork({ shopStatus: 200, shopPage: '<html><title>Amazon.com.tr</title><form action="/errors/validateCaptcha"></form></html>' });
  const attempt = await readLink(LINK, { retries: 1, unblocker: createUnblocker({ db: fakeDb(), env: env() }) });
  assert.deepEqual(calls, ['shop', 'api']);
  assert.equal(attempt.outcome, 'ok');
  assert.equal(attempt.layer, 'unblock:json-ld');
});

test('a listed shop goes straight to the API', async () => {
  const calls = fakeNetwork();
  const unblocker = createUnblocker({ db: fakeDb(), env: env({ UNBLOCK_HOSTS: 'shop.example, vatanbilgisayar.com' }) });
  const attempt = await readLink(LINK, { retries: 1, unblocker });
  assert.deepEqual(calls, ['api']);
  assert.equal(attempt.outcome, 'ok');
});

test('the layer stops once the monthly limit is used up', async () => {
  const calls = fakeNetwork();
  const unblocker = createUnblocker({ db: fakeDb(2), env: env({ UNBLOCK_MONTHLY_LIMIT: '3' }) });
  assert.equal((await readLink(LINK, { retries: 1, unblocker })).outcome, 'ok');
  const second = await readLink(LINK, { retries: 1, unblocker });
  assert.equal(second.outcome, 'http_error');
  assert.equal(second.layer, null);
  assert.deepEqual(calls, ['shop', 'api', 'shop']);
});

test('an API failure is logged as an unblock attempt and never shows the key', async () => {
  fakeNetwork({ apiStatus: 500 });
  const warnings = [];
  const realWarn = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    const attempt = await readLink(LINK, { retries: 1, unblocker: createUnblocker({ db: fakeDb(), env: env() }) });
    assert.equal(attempt.outcome, 'http_error');
    assert.equal(attempt.httpStatus, 500);
    assert.equal(attempt.layer, 'unblock');
  } finally {
    console.warn = realWarn;
  }
  assert.ok(warnings.length);
  assert.ok(warnings.every((w) => !w.includes(KEY)));
});

test('if the monthly count cannot be read, no paid request is made', async () => {
  const calls = fakeNetwork();
  const db = { from: () => ({ select: () => ({ like: () => ({ gte: async () => ({ count: null, error: { message: 'down' } }) }) }) }) };
  const realWarn = console.warn;
  console.warn = () => {};
  try {
    const attempt = await readLink(LINK, { retries: 1, unblocker: createUnblocker({ db, env: env() }) });
    assert.equal(attempt.outcome, 'http_error');
  } finally {
    console.warn = realWarn;
  }
  assert.deepEqual(calls, ['shop']);
});

test('when the real browser reads the price, the API is not paid for', async () => {
  const calls = fakeNetwork();
  const browser = fakeBrowser({ outcome: 'ok', httpStatus: 200, layer: 'browser/json-ld', html: PAGE, product: { price: 1 } });
  const attempt = await readLink(LINK, { retries: 1, browser, unblocker: createUnblocker({ db: fakeDb(), env: env() }) });
  assert.deepEqual(calls, ['shop']);
  assert.equal(browser.calls, 1);
  assert.equal(attempt.layer, 'browser/json-ld');
});

test('the API is tried only after the real browser is turned away too', async () => {
  const calls = fakeNetwork();
  const browser = fakeBrowser({ outcome: 'http_error', httpStatus: 403, html: null, product: null });
  const attempt = await readLink(LINK, { retries: 1, browser, unblocker: createUnblocker({ db: fakeDb(), env: env() }) });
  assert.deepEqual(calls, ['shop', 'api']);
  assert.equal(browser.calls, 1);
  assert.equal(attempt.layer, 'unblock:json-ld');
});

test('a page the browser opened without a price is not sent to the API', async () => {
  const calls = fakeNetwork();
  const browser = fakeBrowser({ outcome: 'no_price', httpStatus: 200, html: '<html></html>', product: null });
  const attempt = await readLink(LINK, { retries: 1, browser, unblocker: createUnblocker({ db: fakeDb(), env: env() }) });
  assert.deepEqual(calls, ['shop']);
  assert.equal(attempt.outcome, 'no_price');
});

test('a listed shop skips the browser and goes to the API', async () => {
  const calls = fakeNetwork();
  const browser = fakeBrowser();
  const unblocker = createUnblocker({ db: fakeDb(), env: env({ UNBLOCK_HOSTS: 'shop.example' }) });
  await readLink(LINK, { retries: 1, browser, unblocker });
  assert.deepEqual(calls, ['api']);
  assert.equal(browser.calls, 0);
});

test('config parsing and host matching', () => {
  assert.deepEqual(unblockConfig({}), { apiKey: null, hosts: [], renderHosts: ['trendyol.com'], monthlyLimit: 900 });
  const config = unblockConfig({ SCRAPER_API_KEY: ' k ', UNBLOCK_HOSTS: 'www.Hepsiburada.com, ,vatanbilgisayar.com', UNBLOCK_MONTHLY_LIMIT: 'x' });
  assert.deepEqual(config, { apiKey: 'k', hosts: ['hepsiburada.com', 'vatanbilgisayar.com'], renderHosts: ['trendyol.com'], monthlyLimit: 900 });
  assert.ok(isListed(config.hosts, 'https://m.hepsiburada.com/p'));
  assert.ok(!isListed(config.hosts, 'https://nothepsiburada.com/p'));
  assert.ok(!isListed(config.hosts, 'not a url'));
  assert.equal(apiUrl('k', 'https://a.example/x?y=1'), 'https://api.scraperapi.com/?api_key=k&url=https%3A%2F%2Fa.example%2Fx%3Fy%3D1');
});

test('render hosts are read with render=true, logged as rendered and counted at 10 credits', async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return String(url).startsWith('https://api.scraperapi.com/') ? new Response(PAGE) : new Response('blocked', { status: 403 });
  };
  const unblocker = createUnblocker({ db: fakeDb(), env: env() });
  const attempt = await readLink('https://www.trendyol.com/x/y-p-1', { retries: 1, unblocker });
  assert.match(urls[1], /render=true/);
  assert.equal(attempt.layer, 'unblock-render:json-ld');
  assert.equal(apiUrl('k', 'https://a.example/x', { render: true }).endsWith('&render=true'), true);
  // 87 reads, 2 of them rendered: 85 + 2 x 10 = 105 credits, over a limit of 100.
  const spent = createUnblocker({ db: fakeDb(87, 2), env: env({ UNBLOCK_MONTHLY_LIMIT: '100' }) });
  assert.equal(await spent.hasCredit(), false);
  assert.equal(await createUnblocker({ db: fakeDb(87, 0), env: env({ UNBLOCK_MONTHLY_LIMIT: '100' }) }).hasCredit(), true);
});

test('a product read through the API keeps its saved external id', async () => {
  fakeNetwork();
  const unblocker = createUnblocker({ db: fakeDb(), env: env() });
  const attempt = await readLink(LINK, { retries: 1, externalId: 'saved-id', unblocker });
  assert.equal(attempt.layer, 'unblock:json-ld');
  assert.equal(attempt.product.external_id, 'saved-id');
});

test('a product read by the real browser keeps its saved external id', async () => {
  fakeNetwork();
  const browser = fakeBrowser({ outcome: 'ok', httpStatus: 200, layer: 'browser/json-ld', html: PAGE, product: { price: 1, external_id: 'new-id' } });
  const attempt = await readLink(LINK, { retries: 1, externalId: 'saved-id', browser, unblocker: null });
  assert.equal(attempt.product.external_id, 'saved-id');
});
