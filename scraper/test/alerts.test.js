import assert from 'node:assert/strict';
import test from 'node:test';
import { alertEmail, dueAlerts, processAlerts } from '../src/alerts.js';

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
    assert.equal(table, 'product_latest');
    return { select: () => ({ in: async () => ({ data: [product] }) }) };
  } };
  assert.deepEqual(await processAlerts(db, { siteUrl: 'https://example.app' }), { checked: 1, sent: 1 });
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
  assert.deepEqual(await processAlerts(db, {}), { checked: 0, sent: 0 });
  assert.equal(asked.length, 2);
  assert.ok(!asked[1].includes('lang'));
});
