import assert from 'node:assert/strict';
import test from 'node:test';
import { attemptRow, botWall, messageFor, outcomeForError } from '../src/track-outcome.js';
import { findRegressions, markdownTable, parseUrlList, probeRow, regressionSection } from '../src/probe.js';

test('outcomeForError tells HTTP answers, timeouts and network failures apart', () => {
  assert.equal(outcomeForError(Object.assign(new Error('HTTP 403'), { status: 403 })), 'http_error');
  assert.equal(outcomeForError(new DOMException('slow', 'TimeoutError')), 'timeout');
  assert.equal(outcomeForError(new TypeError('fetch failed')), 'network');
});

test('messageFor gives each failure its own message', () => {
  assert.match(messageFor('http_error', 403), /block automated visits/);
  assert.match(messageFor('http_error', 429), /block automated visits/);
  assert.match(messageFor('http_error', 404), /not found at the shop/);
  assert.match(messageFor('http_error', 500), /returned an error/);
  assert.match(messageFor('no_price'), /No price found/);
  assert.match(messageFor('timeout'), /did not respond in time/);
  assert.match(messageFor('network'), /Could not open that page/);
});

test('attemptRow groups by shop host and keeps the reason', () => {
  assert.deepEqual(attemptRow({ url: 'https://www.trendyol.com/p-1?x=1', stage: 'daily', outcome: 'http_error', httpStatus: 403 }), {
    url: 'https://www.trendyol.com/p-1?x=1',
    host: 'trendyol.com',
    user_id: null,
    stage: 'daily',
    outcome: 'http_error',
    http_status: 403,
    layer: null,
  });
});

test('probe rows and table show how far reading got', () => {
  const html = '<script type="application/ld+json">{}</script>';
  const row = probeRow('https://shop.example/a', { outcome: 'no_price', httpStatus: 200, html, product: null });
  assert.deepEqual(row, { host: 'shop.example', status: 200, size: '0 KB', jsonLd: 'yes', price: '-', layer: '-', outcome: 'no_price' });
  const blocked = probeRow('https://b.example/x', { outcome: 'http_error', httpStatus: 403, html: null, product: null });
  assert.equal(markdownTable([row, blocked]).split('\n')[3], '| b.example | 403 | - | - | - | - | http_error |');
  assert.deepEqual(parseUrlList('# shops\nhttps://a.example/1\n\n https://b.example/2 # note\n'), ['https://a.example/1', 'https://b.example/2']);
});

test('botWall spots robot-check pages but not product pages that mention a captcha', () => {
  assert.equal(botWall('<form action="/errors/validateCaptcha">Robot Check</form>'), true);
  assert.equal(botWall('<title>Just a moment...</title>'), true);
  assert.equal(botWall('<h1>Kulaklık</h1>'), false);
  assert.equal(botWall(`<p>captcha</p>${'x'.repeat(70_000)}`), false);
  assert.equal(botWall(null), false);
});

test('probe regressions are links that read a price before and do not now', () => {
  const previous = {
    rows: [
      { url: 'https://a.example/1', outcome: 'ok' },
      { url: 'https://b.example/1', outcome: 'ok' },
      { url: 'https://c.example/1', outcome: 'http_error' },
    ],
  };
  const rows = [
    { url: 'https://a.example/1', host: 'a.example', status: 403, outcome: 'http_error' },
    { url: 'https://b.example/1', host: 'b.example', status: 200, outcome: 'ok' },
    { url: 'https://c.example/1', host: 'c.example', status: 403, outcome: 'http_error' },
    { url: 'https://d.example/1', host: 'd.example', status: 404, outcome: 'http_error' },
  ];
  const broken = findRegressions(previous, rows);
  assert.deepEqual(broken.map((r) => r.host), ['a.example']);
  assert.match(regressionSection(broken), /a\.example: read a price last time, now `http_error` \(HTTP 403\)/);
  assert.deepEqual(findRegressions(null, rows), []);
  assert.equal(regressionSection([]), '');
});
