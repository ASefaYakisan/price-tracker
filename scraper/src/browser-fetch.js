// Second try for links a plain request could not read: open the page in a real Chromium (Playwright),
// let its scripts run, then read the price from the rendered page.
// Used by the pending-links run and the daily refresh; the site itself never launches a browser.
import { cleanTitle, pickImage } from './clean-product.js';
import { assertPublicUrl } from './safe-url.js';
import { canonicalUrl, extractProduct, parseAmount } from './extract-price.js';

const PAGE_TIMEOUT_MS = 30_000;
const SETTLE_TIMEOUT_MS = 8_000;
const BLOCKED_RESOURCES = new Set(['image', 'font', 'media']);

// A missing page will not appear in a browser either.
export function worthBrowserRetry(attempt) {
  if (attempt.product) return false;
  return !(attempt.outcome === 'http_error' && [404, 410].includes(attempt.httpStatus));
}

// Opens Chromium on the first retry and keeps it for the run; `maxPages` caps how long one run can take.
// When Playwright or its browser is missing, retries are skipped and the plain-request result stands.
export function createBrowserReader({ maxPages = 40, launch = launchChromium, guard = assertPublicUrl } = {}) {
  let browser;
  let launching; // reads run side by side (refresh.js), so the first retries must share one launch
  let unavailable = false;
  let used = 0;

  async function retry(url, attempt) {
    if (!worthBrowserRetry(attempt) || unavailable || used >= maxPages) return attempt;
    if (!browser) {
      try {
        browser = await (launching ??= launch());
      } catch (err) {
        unavailable = true;
        console.warn(`  browser unavailable, skipping browser retries: ${err.message ?? err}`);
        return attempt;
      }
    }
    used++;
    let second;
    try {
      second = await readInBrowser(browser, url, guard);
    } catch (err) {
      console.warn(`  browser failed on ${url}: ${err.message ?? err}`);
      return attempt;
    }
    console.log(`  browser: ${second.outcome}${second.httpStatus ? ` ${second.httpStatus}` : ''} ${url}`);
    return second.product || !attempt.html ? second : attempt;
  }

  async function close() {
    await browser?.close().catch(() => {});
    browser = undefined;
    launching = undefined;
  }

  return { retry, close };
}

async function launchChromium() {
  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true });
}

export async function readInBrowser(browser, url, guard = assertPublicUrl) {
  const context = await browser.newContext({ locale: 'tr-TR', viewport: { width: 1366, height: 900 } });
  try {
    const page = await context.newPage();
    // Redirects and sub-requests go through the same address check as the first request.
    await page.route('**/*', async (route) => {
      if (BLOCKED_RESOURCES.has(route.request().resourceType())) return route.abort();
      try {
        await guard(route.request().url());
      } catch {
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    let response;
    try {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    } catch (err) {
      return { outcome: err.name === 'TimeoutError' ? 'timeout' : 'network', httpStatus: null, html: null, product: null };
    }
    const status = response?.status() ?? null;
    if (status && status >= 400) return { outcome: 'http_error', httpStatus: status, html: null, product: null };
    await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS }).catch(() => {});

    const html = await page.content();
    // Keyed by the saved link, not where the shop redirected, so the price lands on the same product.
    let product = extractProduct(html, url);
    if (product) product = { ...product, layer: `browser/${product.layer}` };
    else product = productFromDom(await renderedPrice(page), url);
    return { outcome: product ? 'ok' : 'no_price', httpStatus: status, layer: product?.layer ?? null, html, product };
  } finally {
    await context.close().catch(() => {});
  }
}

// Shops that draw the price with scripts and publish no structured data: take the first visible,
// short text in an element named like a price, plus a title from og:title, h1 or <title>.
async function renderedPrice(page) {
  return page.evaluate(() => {
    const selectors = ['[itemprop="price"]', '[data-testid*="price" i]', '[class*="price" i]', '[id*="price" i]'];
    let price = null;
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        const text = (el.innerText || '').trim();
        const box = el.getBoundingClientRect();
        if (!text || text.length > 40 || !/\d/.test(text) || box.width === 0 || box.height === 0) continue;
        if (getComputedStyle(el).textDecorationLine.includes('line-through')) continue; // the old, crossed-out price
        price = text;
        break;
      }
      if (price) break;
    }
    const og = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const image = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    const title = og || document.querySelector('h1')?.innerText || document.title;
    return { price, title: (title || '').trim(), image: image || null };
  });
}

export function productFromDom({ price, title, image }, url) {
  const amount = parseAmount(price);
  if (amount == null) return null;
  return {
    external_id: canonicalUrl(url),
    title: cleanTitle(title || '').slice(0, 300) || url.slice(0, 300),
    url,
    image_url: pickImage([image], url),
    price: amount,
    currency: currencyFromText(price),
    in_stock: true,
    rating: null,
    layer: 'browser/dom',
  };
}

const CURRENCY_SIGNS = [['₺', 'TRY'], ['TL', 'TRY'], ['€', 'EUR'], ['£', 'GBP'], ['$', 'USD']];

function currencyFromText(text) {
  const code = String(text).match(/\b(TRY|USD|EUR|GBP)\b/i)?.[1];
  if (code) return code.toUpperCase();
  return CURRENCY_SIGNS.find(([sign]) => String(text).includes(sign))?.[1] ?? null;
}
