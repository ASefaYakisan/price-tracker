// Gold prices from the free fawazahmed0/exchange-api (daily, no key needed).
import { fetchJson } from '../fetch.js';

export const name = 'gold';
const SOURCES = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json',
  'https://latest.currency-api.pages.dev/v1/currencies/xau.json',
];
const GRAMS_PER_TROY_OUNCE = 31.1034768;

export async function fetchAll() {
  let lastError;
  for (const url of SOURCES) {
    try {
      return parseGold(await fetchJson(url));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export function parseGold(json) {
  const rates = json?.xau;
  if (!rates || typeof rates.try !== 'number' || typeof rates.usd !== 'number') {
    throw new Error('Unexpected gold response');
  }
  const base = { url: 'https://github.com/fawazahmed0/exchange-api', image_url: null, in_stock: true, rating: null };
  return [
    { ...base, external_id: 'XAU-gram-TRY', title: 'Gram Gold (TRY)', price: +(rates.try / GRAMS_PER_TROY_OUNCE).toFixed(2), currency: 'TRY' },
    { ...base, external_id: 'XAU-ounce-USD', title: 'Gold Ounce (USD)', price: +rates.usd.toFixed(2), currency: 'USD' },
  ];
}
