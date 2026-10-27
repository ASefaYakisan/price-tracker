import assert from 'node:assert/strict';
import test from 'node:test';
import { alertEmail, dueAlerts, processAlerts } from '../src/alerts.js';

// Fake price_history: rows newest first, as the query asks for them.
function historyDb(prices) {
  const q = { select: () => q, eq: () => q, not: () => q, order: () => q, limit: async () => ({ data: prices.map((price) => ({ price })), error: null }) };
  return q;
}

const product = { id: 7, title: 'Bitcoin (BTC)', url: 'https://www.coingecko.com/en/coins/bitcoin', currency: 'USD', price: '61000.5' };

test('dueAlerts keeps only alerts whose target is reached', () => {
  const alerts = [
    { id: 1, product_id: 7, email: 'a@x.io', target_price: '62000' },
    { id: 2, product_id: 7, email: 'b@x.io', target_price: '60000' },
    { id: 3, product_id: 99, email: 'c@x.io', target_price: '1' },
  ];
  const due = dueAlerts(alerts, new Map([[7, product]]));
  assert.deepEqual(due.map((a) => a.id), [1]);
});

test('dueAlerts holds alerts while the product is out of stock', () => {
  const alerts = [{ id: 1, product_id: 7, email: 'a@x.io', target_price: '62000' }];
  assert.deepEqual(dueAlerts(alerts, new Map([[7, { ...product, in_stock: false }]])), []);
  // Back in stock and still under target: the alert fires.
  assert.deepEqual(dueAlerts(alerts, new Map([[7, { ...product, in_stock: true }]])).map((a) => a.id), [1]);
});

test('dueAlerts treats unknown stock as in stock', () => {
  const alerts = [{ id: 1, product_id: 7, email: 'a@x.io', target_price: '62000' }];
  assert.deepEqual(dueAlerts(alerts, new Map([[7, { ...product, in_stock: null }]])).map((a) => a.id), [1]);
});

test('alertEmail links to the price history page when the site URL is known', () => {
  const mail = alertEmail({ product, target_price: '62000' }, 'https://example.app/');
  assert.match(mail.subject, /Bitcoin \(BTC\) is now \$61,000\.5/);
  assert.match(mail.text, /https:\/\/example\.app\/products\/7/);
  assert.match(mail.text, /your target: \$62,000/);
});


test('removal link and unsubscribe header carry the alert token, not the product id', () => {
  const mail = alertEmail({ id: 42, manage_token: 'test-token&encoded', product, target_price: 62000 }, 'https://example.app/');
  const link = new URL(mail.headers['List-Unsubscribe'].slice(1, -1));
  assert.equal(link.pathname, '/alerts/remove');
  assert.equal(link.searchParams.get('id'), '42');
  assert.equal(link.searchParams.get('token'), 'test-token&encoded');
  assert.ok(mail.text.includes(`Remove this alert: ${link.href}`));
  assert.ok(mail.text.includes('Set or change a target: https://example.app/products/7#alert'));
});

test('without SITE_URL, no management links or unsubscribe header are emitted', () => {
  const mail = alertEmail({ id: 42, manage_token: 'test-token', product, target_price: 62000 }, '');
  assert.equal(mail.headers, undefined);
  assert.ok(mail.text.includes(product.url));
  assert.doesNotMatch(mail.text, /Remove this alert|Set or change a target|test-token/);
});

test('legacy alerts without a token do not get a broken removal link', () => {
  const mail = alertEmail({ id: 42, product, target_price: 62000 }, 'https://example.app');
  assert.equal(mail.headers, undefined);
  assert.doesNotMatch(mail.text, /Remove this alert/);
});

test('processAlerts selects manage_token and passes List-Unsubscribe to Resend', async (t) => {
  const oldKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-only';
  t.after(() => {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
  });
  let payload;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    payload = JSON.parse(options.body);
    return new Response('{}', { status: 200 });
  });
  let marked = false;
  const db = { from(table) {
    if (table === 'alerts') return {
      select(fields) {
        assert.ok(fields.split(', ').includes('manage_token'));
        return { is: async () => ({ data: [{ id: 42, product_id: 7, email: 'test@example.com', target_price: 62000, manage_token: 'test-token' }] }) };
      },
      update() { return { eq: async () => { marked = true; return {}; } }; },
    };
    if (table === 'price_history') return historyDb([61000, 61500]);
    assert.equal(table, 'product_latest');
    return { select: () => ({ in: async () => ({ data: [product] }) }) };
  } };
  assert.deepEqual(await processAlerts(db, { siteUrl: 'https://example.app' }), { checked: 1, sent: 1, failed: 0 });
  assert.equal(payload.headers['List-Unsubscribe'], '<https://example.app/alerts/remove?id=42&token=test-token>');
  assert.equal(payload.to, 'test@example.com');
  assert.equal(marked, true);
});

test('alertEmail accepts a language and falls back to the English text for any of them', () => {
  const en = alertEmail({ product, target_price: '62000' }, 'https://example.app/');
  assert.deepEqual(alertEmail({ product, target_price: '62000' }, 'https://example.app/', 'tr'), en);
  assert.deepEqual(alertEmail({ product, target_price: '62000' }, 'https://example.app/', 'zz'), en);
});

test('processAlerts retries without lang when the column does not exist yet', async () => {
  const asked = [];
  const db = { from() { return { select(fields) {
    asked.push(fields);
    return { is: async () => (fields.includes('lang') ? { data: null, error: { code: '42703' } } : { data: [], error: null }) };
  } }; } };
  assert.deepEqual(await processAlerts(db, {}), { checked: 0, sent: 0, failed: 0 });
  assert.equal(asked.length, 2);
  assert.ok(!asked[1].includes('lang'));
});

async function runHeldAlert(t, prices) {
  const oldKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-only';
  t.after(() => {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
  });
  t.mock.method(console, 'warn', () => {});
  let mails = 0;
  let marked = false;
  t.mock.method(globalThis, 'fetch', async () => { mails++; return new Response('{}', { status: 200 }); });
  const latest = { ...product, price: String(prices[0]) };
  const db = { from(table) {
    if (table === 'price_history') return historyDb(prices);
    if (table === 'alerts') return {
      select: () => ({ is: async () => ({ data: [{ id: 1, product_id: 7, email: 'a@x.io', target_price: 150 }], error: null }) }),
      update() { return { eq: async () => { marked = true; return {}; } }; },
    };
    return { select: () => ({ in: async () => ({ data: [latest] }) }) };
  } };
  const result = await processAlerts(db, { siteUrl: '' });
  return { result, mails, marked };
}

test('a single 1000 -> 100 reading sends no alert and leaves the alert open', async (t) => {
  const { result, mails, marked } = await runHeldAlert(t, [100, 1000]);
  assert.deepEqual(result, { checked: 1, sent: 0, failed: 0 });
  assert.equal(mails, 0);
  assert.equal(marked, false);
});

test('the alert goes out once the low price is read a second time', async (t) => {
  const { result, mails, marked } = await runHeldAlert(t, [100, 100.5]);
  assert.deepEqual(result, { checked: 1, sent: 1, failed: 0 });
  assert.equal(mails, 1);
  assert.equal(marked, true);
});

test('a big drop is held, a normal drop under target is not', async (t) => {
  const { result } = await runHeldAlert(t, [140, 1000]);
  assert.equal(result.sent, 0);
  const second = await runHeldAlert(t, [140, 200]);
  assert.equal(second.result.sent, 1);
});

test('a product with no earlier reading alerts as before', async (t) => {
  const { result } = await runHeldAlert(t, [100]);
  assert.equal(result.sent, 1);
});

// Retry behaviour: fake Resend answers in order, a fake sleep records the waits.
async function runWithResend(t, answers, alertCount = 1) {
  const oldKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-only';
  t.after(() => {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
  });
  t.mock.method(console, 'error', () => {});
  const calls = [];
  const marked = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(JSON.parse(options.body).to);
    const next = answers.shift() ?? new Response('{}', { status: 200 });
    if (next instanceof Error) throw next;
    return next;
  });
  const rows = Array.from({ length: alertCount }, (_, i) => ({ id: i + 1, product_id: 7, email: `u${i + 1}@x.io`, target_price: 62000 }));
  const db = { from(table) {
    if (table === 'price_history') return historyDb([61000, 61500]);
    if (table === 'alerts') return {
      select: () => ({ is: async () => ({ data: rows, error: null }) }),
      update() { return { eq: async (_c, id) => { marked.push(id); return {}; } }; },
    };
    return { select: () => ({ in: async () => ({ data: [product] }) }) };
  } };
  const waits = [];
  const result = await processAlerts(db, { siteUrl: '', sleep: async (ms) => { waits.push(ms); } });
  return { result, calls, marked, waits };
}

test('a 429 from Resend is retried and the alert is marked sent once', async (t) => {
  const { result, calls, marked, waits } = await runWithResend(t, [new Response('slow down', { status: 429 })]);
  assert.deepEqual(result, { checked: 1, sent: 1, failed: 0 });
  assert.equal(calls.length, 2);
  assert.deepEqual(marked, [1]);
  assert.deepEqual(waits, [1000]);
});

test('Retry-After from Resend decides the wait', async (t) => {
  const limited = new Response('slow down', { status: 429, headers: { 'retry-after': '2' } });
  const { waits } = await runWithResend(t, [limited]);
  assert.deepEqual(waits, [2000]);
});

test('three 503 answers leave the alert open and the next alert is still processed', async (t) => {
  const down = () => new Response('down', { status: 503 });
  const { result, calls, marked } = await runWithResend(t, [down(), down(), down()], 2);
  assert.deepEqual(result, { checked: 2, sent: 1, failed: 1 });
  assert.deepEqual(calls, ['u1@x.io', 'u1@x.io', 'u1@x.io', 'u2@x.io']);
  assert.deepEqual(marked, [2]);
});

test('a network error is retried like a 5xx', async (t) => {
  const { result, calls } = await runWithResend(t, [new TypeError('fetch failed')]);
  assert.equal(result.sent, 1);
  assert.equal(calls.length, 2);
});

test('400 and 401 answers are not retried', async (t) => {
  for (const status of [400, 401]) {
    const { result, calls, marked } = await runWithResend(t, [new Response('bad', { status })]);
    assert.deepEqual(result, { checked: 1, sent: 0, failed: 1 });
    assert.equal(calls.length, 1);
    assert.deepEqual(marked, []);
  }
});

test('mails are spaced apart, the first one goes out at once', async (t) => {
  const { waits } = await runWithResend(t, [], 3);
  assert.deepEqual(waits, [600, 600]);
});
