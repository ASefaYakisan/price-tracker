import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import test from 'node:test';
import { alertText } from '../src/alert-i18n.js';
import { alertEmail } from '../src/alerts.js';

// Use the site's dictionaries so a newly supported language is checked too.
const languages = readdirSync(new URL('../../web/src/i18n/dictionaries/', import.meta.url))
  .filter((file) => file.endsWith('.ts')).map((file) => file.slice(0, -3));
const english = alertText('en');
const placeholders = (text) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
const product = { id: 7, title: 'Test product', price: 100, currency: 'USD', url: 'https://example.com/product' };
const site = 'https://example.com';

for (const lang of languages) {
  test(`${lang}: alert message keys and placeholders match English`, () => {
    const messages = alertText(lang);
    if (lang !== 'en') assert.notStrictEqual(messages, english, `${lang}: missing translation dictionary`);
    const expected = Object.keys(english).sort();
    const actual = Object.keys(messages).sort();
    assert.deepEqual(actual, expected, `${lang}: missing keys [${expected.filter((key) => !actual.includes(key))}]; extra keys [${actual.filter((key) => !expected.includes(key))}]`);
    for (const key of expected) {
      assert.equal(typeof messages[key], 'string', `${lang}.${key}: expected a string`);
      const expectedNames = placeholders(english[key]);
      const actualNames = placeholders(messages[key]);
      const missing = expectedNames.filter((name) => !actualNames.includes(name));
      const extra = actualNames.filter((name) => !expectedNames.includes(name));
      assert.deepEqual(actualNames, expectedNames, `${lang}.${key}: missing [${missing}]; extra [${extra}]`);
    }
  });

  for (const direction of ['below', 'above']) {
    test(`${lang}: ${direction} email fills its subject and body`, () => {
      const target_price = direction === 'above' ? 90 : 110;
      const mail = alertEmail({ product, target_price, direction }, site, lang);
      const messages = alertText(lang);
      const values = { title: product.title, price: '$100.00', target: `$${target_price}.00` };
      const fill = (text) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]);
      assert.equal(mail.subject, fill(messages.subject));
      assert.equal(mail.text.split('\n')[0], fill(messages[direction === 'above' ? 'bodyAbove' : 'body']));
      for (const [key, value] of Object.entries({ subject: mail.subject, body: mail.text })) {
        assert.ok(value.trim(), `${lang}.${direction}.${key}: empty`);
        assert.doesNotMatch(value, /[{}]/, `${lang}.${direction}.${key}: unfilled placeholder`);
      }
    });
  }
}

test('unknown languages fall back to English for both directions', () => {
  for (const lang of ['unknown-language', '', '__proto__']) {
    assert.deepEqual(alertText(lang), english);
    for (const direction of ['below', 'above']) {
      const alert = { product, target_price: 100, direction };
      assert.deepEqual(alertEmail(alert, site, lang), alertEmail(alert, site, 'en'));
    }
  }
});
