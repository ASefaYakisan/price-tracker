// Adapter for the CoinGecko public API: top coins by market cap, priced in USD.
import { fetchJson } from '../fetch.js';

export const name = 'coingecko';
const API = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1';

export async function fetchAll() {
  // Optional free "demo" key raises the rate limit; the API also works without one.
  const key = process.env.COINGECKO_API_KEY;
  return parseMarkets(await fetchJson(API, { headers: key ? { 'x-cg-demo-api-key': key } : {} }));
}

export function parseMarkets(coins) {
  if (!Array.isArray(coins)) throw new Error('Unexpected CoinGecko response');
  return coins
    .filter((c) => c.id && typeof c.current_price === 'number')
    .map((c) => ({
      external_id: c.id,
      title: `${c.name} (${String(c.symbol).toUpperCase()})`,
      url: `https://www.coingecko.com/en/coins/${c.id}`,
      image_url: c.image ?? null,
      price: c.current_price,
      currency: 'USD',
      in_stock: true,
      rating: null,
    }));
}
