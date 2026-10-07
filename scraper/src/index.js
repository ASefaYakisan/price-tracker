import * as booksToScrape from './adapters/books-toscrape.js';
import * as coingecko from './adapters/coingecko.js';
import * as gold from './adapters/gold.js';
import * as tcmb from './adapters/tcmb.js';
import { fetchText, sleep } from './fetch.js';
import { createStore } from './store.js';

// Two adapter shapes: HTML listings we crawl page by page, and APIs that return everything in one call.
const ADAPTERS = Object.fromEntries([booksToScrape, coingecko, tcmb, gold].map((a) => [a.name, a]));

export async function crawl(adapter, { maxPages = 5, delayMs = 1000 } = {}) {
  const all = [];
  let url = adapter.startUrl;
  for (let page = 1; url && page <= maxPages; page++) {
    const { products, nextUrl } = adapter.parseListing(await fetchText(url), url);
    all.push(...products);
    console.log(`  page ${page}: ${products.length} products`);
    url = nextUrl;
    if (url) await sleep(delayMs);
  }
  return all;
}

async function collect(adapter, maxPages) {
  return adapter.fetchAll ? adapter.fetchAll() : crawl(adapter, { maxPages });
}

async function main() {
  const [sourceArg = 'all', pages = '3'] = process.argv.slice(2);
  const names = sourceArg === 'all' ? Object.keys(ADAPTERS) : [sourceArg];
  const unknown = names.filter((n) => !ADAPTERS[n]);
  if (unknown.length) throw new Error(`Unknown source "${unknown[0]}". Known: all, ${Object.keys(ADAPTERS).join(', ')}`);

  const store = createStore();
  const scrapedAt = new Date().toISOString();
  const failures = [];
  // One failing source must not stop the others from being saved.
  for (const name of names) {
    console.log(`${name}:`);
    try {
      const products = await collect(ADAPTERS[name], Number(pages));
      if (!products.length) throw new Error('no products found');
      const where = await store.save(name, products, scrapedAt);
      console.log(`  saved ${products.length} products to ${store.kind}${where ? ` (${where})` : ''}`);
    } catch (err) {
      console.error(`  FAILED: ${err.message ?? err}`);
      failures.push(name);
    }
  }
  if (failures.length) {
    console.error(`Failed sources: ${failures.join(', ')}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
