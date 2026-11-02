import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import { fetchText } from '../src/fetch.js';
import { fetchAll as fetchGold } from '../src/adapters/gold.js';

// A server that accepts the connection but never answers.
function silentServer() {
  const server = http.createServer(() => {});
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

test('fetchText gives up on a silent server even without timeoutMs', async () => {
  const { server, url } = await silentServer();
  const realTimeout = AbortSignal.timeout;
  AbortSignal.timeout = (ms) => realTimeout.call(AbortSignal, Math.min(ms, 50));
  try {
    const started = Date.now();
    await assert.rejects(fetchText(url, { retries: 2 }), (err) => err.name === 'TimeoutError');
    assert.ok(Date.now() - started < 5000);
  } finally {
    AbortSignal.timeout = realTimeout;
    server.closeAllConnections();
    server.close();
  }
});

test('an explicit timeoutMs is not retried', async () => {
  const { server, url } = await silentServer();
  let hits = 0;
  server.on('request', () => hits++);
  try {
    await assert.rejects(fetchText(url, { timeoutMs: 50, retries: 3 }), (err) => err.name === 'TimeoutError');
    assert.equal(hits, 1);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('gold falls back to the second source when the first never answers', async () => {
  const realFetch = globalThis.fetch;
  const realTimeout = AbortSignal.timeout;
  AbortSignal.timeout = (ms) => realTimeout.call(AbortSignal, Math.min(ms, 30));
  const keepAlive = setInterval(() => {}, 1000); // the abort timers are unref'd, keep the loop alive
  globalThis.fetch = (url, init) => {
    if (String(url).includes('jsdelivr')) {
      return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
    }
    return Promise.resolve(new Response(JSON.stringify({ xau: { try: 311034.768, usd: 2000 } }), { status: 200, headers: { 'content-type': 'application/json' } }));
  };
  try {
    const rows = await fetchGold();
    assert.equal(rows.length, 2);
    assert.equal(rows[0].price, 10000);
  } finally {
    clearInterval(keepAlive);
    globalThis.fetch = realFetch;
    AbortSignal.timeout = realTimeout;
  }
});
