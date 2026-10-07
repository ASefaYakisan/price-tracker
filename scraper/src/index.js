import * as booksToScrape from './adapters/books-toscrape.js';
import { fetchHtml, sleep } from './fetch.js';
import { createStore } from './store.js';

const ADAPTERS = { [booksToScrape.name]: booksToScrape };

export async function crawl(adapter, { maxPages = 5, delayMs = 1000 } = {}) {
  const all = [];
  let url = adapter.startUrl;
  for (let page = 1; url && page <= maxPages; page++) {
    const { products, nextUrl } = adapter.parseListing(await fetchHtml(url), url);
    all.push(...products);
    console.log(`page ${page}: ${products.length} products`);
    url = nextUrl;
    if (url) await sleep(delayMs);
  }
  return all;
}

async function main() {
  const [sourceName = booksToScrape.name, pages = '5'] = process.argv.slice(2);
  const adapter = ADAPTERS[sourceName];
  if (!adapter) throw new Error(`Unknown source "${sourceName}". Known: ${Object.keys(ADAPTERS).join(', ')}`);

  const products = await crawl(adapter, { maxPages: Number(pages) });
  const store = createStore();
  const where = await store.save(adapter.name, products, new Date().toISOString());
  console.log(`saved ${products.length} products to ${store.kind}${where ? ` (${where})` : ''}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
