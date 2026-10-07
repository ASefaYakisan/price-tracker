import assert from 'node:assert/strict';
import test from 'node:test';
import { alertEmail, dueAlerts } from '../src/alerts.js';

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

test('alertEmail links to the price history page when the site URL is known', () => {
  const mail = alertEmail({ product, target_price: '62000' }, 'https://example.app/');
  assert.match(mail.subject, /Bitcoin \(BTC\) is now \$61,000\.5/);
  assert.match(mail.text, /https:\/\/example\.app\/products\/7/);
  assert.match(mail.text, /your target: \$62,000/);
});
