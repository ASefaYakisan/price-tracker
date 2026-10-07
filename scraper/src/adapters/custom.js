// Products people added by pasting a link. Re-reads each saved page with the generic extractor.
import { extractProduct } from '../extract-price.js';
import { fetchText, sleep } from '../fetch.js';

export const name = 'custom';

export async function fetchAll({ db } = {}) {
  if (!db) return []; // nothing to refresh without the database that holds the links
  const { data, error } = await db.from('products').select('url').eq('source', 'custom');
  if (error) throw error;
  const products = [];
  for (const { url } of data) {
    try {
      const product = extractProduct(await fetchText(url, { headers: BROWSER_HEADERS }), url);
      if (product) products.push(product);
      else console.warn(`  no price found on ${url}`);
    } catch (err) {
      console.warn(`  ${url}: ${err.message ?? err}`);
    }
    await sleep(1500);
  }
  return products;
}

// Many shops refuse requests that do not look like a browser.
export const BROWSER_HEADERS = {
  'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  "sec-ch-ua": '"Chromium";v="141", "Google Chrome";v="141", "Not?A_Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};
