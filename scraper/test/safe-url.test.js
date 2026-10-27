import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readThroughLayers } from '../src/adapters/custom.js';
import { fetchText } from '../src/fetch.js';
import { assertPublicUrl } from '../src/safe-url.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const PUBLIC = { resolve: async () => ['93.184.216.34'] };

test('private, loopback, link-local and CGNAT addresses are refused', async () => {
  for (const host of ['127.0.0.1', '10.0.0.5', '172.16.1.1', '192.168.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '[::1]', '[fd00::1]', '[::ffff:127.0.0.1]']) {
    await assert.rejects(assertPublicUrl(`http://${host}/`, PUBLIC), /not a public address/, host);
  }
  await assert.rejects(assertPublicUrl('https://shop.example/', { resolve: async () => ['93.184.216.34', '10.0.0.1'] }), /not a public address/);
});

test('only public http(s) links without credentials pass', async () => {
  assert.equal((await assertPublicUrl('https://shop.example/p?id=1', PUBLIC)).hostname, 'shop.example');
  await assert.rejects(assertPublicUrl('file:///etc/passwd', PUBLIC), /only http/);
  await assert.rejects(assertPublicUrl('https://user:pw@shop.example/', PUBLIC), /username/);
  await assert.rejects(assertPublicUrl('https://nowhere.example/', { resolve: async () => [] }), /could not resolve/);
  await assert.rejects(assertPublicUrl('nonsense', PUBLIC), /not a link/);
});

// Public host names resolve to a public address; the rest are looked at by IP.
const guard = (url) => assertPublicUrl(url, PUBLIC);
const redirectTo = (location) => new Response(null, { status: 302, headers: { location } });

test('a redirect to cloud metadata is never requested', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    return redirectTo('http://169.254.169.254/latest/meta-data/');
  };
  await assert.rejects(fetchText('https://shop.example/p', { guard, retries: 1 }), /not a public address/);
  assert.deepEqual(requested, ['https://shop.example/p']);
});

test('a redirect to localhost is refused after a relative hop', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    return requested.length === 1 ? redirectTo('/moved') : redirectTo('http://127.0.0.1:8080/admin');
  };
  await assert.rejects(fetchText('https://shop.example/p', { guard, retries: 1 }), /not a public address/);
  assert.deepEqual(requested, ['https://shop.example/p', 'https://shop.example/moved']);
});

test('a chain of six redirects ends with too many redirects', async () => {
  let n = 0;
  globalThis.fetch = async () => redirectTo(`/hop${++n}`);
  await assert.rejects(fetchText('https://shop.example/p', { guard, retries: 1 }), /too many redirects/);
  assert.equal(n, 6);
});

test('public redirects are followed and the page is returned', async () => {
  globalThis.fetch = async (url) => (String(url).endsWith('/new') ? new Response('<html>ok</html>') : redirectTo('/new'));
  assert.equal(await fetchText('https://shop.example/old', { guard, retries: 1 }), '<html>ok</html>');
});

test('a saved link that points at a private address is not requested by any layer', async () => {
  let calls = 0;
  globalThis.fetch = async () => (calls++, new Response('x'));
  const attempt = await readThroughLayers('http://127.0.0.1/admin', { retries: 1 });
  assert.equal(attempt.outcome, 'network');
  assert.equal(attempt.product, null);
  assert.equal(calls, 0);
});
