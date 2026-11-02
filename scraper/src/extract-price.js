// Reads the price from any shop's product page. Tries a series of layers, cheapest and most
// reliable first, and the first layer that finds a price wins:
//   json-ld -> json-ld-list -> microdata -> meta -> embedded-state -> shop adapter
// web/src/lib/extract-price.ts is a TypeScript port of this file; keep them in step.
// Both run the shared fixtures in test/fixtures/shops, so a drift shows up as a failing test.
import * as cheerio from 'cheerio';
import { cleanTitle, pickImage } from './clean-product.js';

export function extractProduct(html, pageUrl) {
  return readPrice(html, pageUrl)?.product ?? null;
}

// Same as extractProduct, plus the name of the layer that found the price.
export function readPrice(html, pageUrl) {
  const $ = cheerio.load(html);
  const url = new URL(pageUrl);
  const ctx = { $, html, url };
  for (const [layer, read] of LAYERS) {
    const found = read(ctx);
    if (found?.price != null) return { layer, product: buildProduct(found, ctx, layer) };
  }
  return null;
}

const LAYERS = [
  ['json-ld', jsonLdProduct],
  ['json-ld-list', jsonLdListing],
  ['microdata', microdataProduct],
  ['meta', metaProduct],
  ['embedded-state', embeddedStateProduct],
  ['shop-adapter', ({ $, html, url }) => SHOP_ADAPTERS.find((a) => a.match(url.hostname))?.extract($, html, url) ?? null],
];

// The winning layer gives the price; anything it lacks comes from the page's general tags.
function buildProduct(found, { $, url }, layer) {
  const meta = metaReader($);
  const currency =
    found.currency ?? meta('product:price:currency') ?? meta('og:price:currency') ?? itempropValue($, 'priceCurrency') ?? null;
  const availability = found.availability ?? meta('product:availability') ?? $('[itemprop="availability"]').first().attr('href') ?? '';
  // The layer's own picture first, then the page's general tags; logos and placeholders are skipped (clean-product.js).
  const image = pickImage(
    [found.image, meta('og:image'), meta('twitter:image'), $('link[rel="image_src"]').attr('href'), itempropValue($, 'image')],
    url,
  );
  const external_id = canonicalUrl(url.href);
  return {
    external_id,
    title: cleanTitle(found.name ?? meta('og:title') ?? $('title').first().text()).slice(0, 300) || external_id,
    url: url.href,
    image_url: image,
    price: found.price,
    currency: currency ? String(currency).toUpperCase() : null,
    in_stock: !/outofstock|out of stock|soldout|discontinued|unavailable|stokta yok|tükendi/i.test(String(availability)),
    rating: null,
    // Which layer found the price, so track_attempts can count wins per kind of markup.
    layer,
  };
}

const metaReader = ($) => (key) =>
  $(`meta[property="${key}"], meta[name="${key}"], meta[itemprop="${key}"]`).first().attr('content')?.trim();

// <meta itemprop="x" content="..."> or <span itemprop="x">text</span>
function itempropValue($, prop) {
  for (const el of $(`[itemprop="${prop}"]`).toArray()) {
    const value = ($(el).attr('content') ?? $(el).text()).trim();
    if (value) return value;
  }
  return null;
}

// ---- json-ld: Product / ProductGroup with Offer, AggregateOffer or variants ----

function jsonLdProduct({ $, url }) {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    let data;
    try {
      data = JSON.parse($(el).text());
    } catch {
      continue;
    }
    for (const node of walk(data)) {
      const types = [].concat(node['@type'] ?? []);
      if (!types.includes('Product') && !types.includes('ProductGroup')) continue;
      const offer = pickOffer(ldOffers(node), url);
      if (!offer) continue;
      const item = offer.variant ?? node;
      return {
        name: typeof item.name === 'string' ? item.name : typeof node.name === 'string' ? node.name : null,
        image: firstImage(item.image) ?? firstImage(node.image),
        price: offer.price,
        currency: offer.currency,
        availability: offer.availability,
      };
    }
  }
  return null;
}

// Every priced offer of a product: plain offers, the offers inside an AggregateOffer, and each variant's offers.
function ldOffers(node, variant = null) {
  const out = [];
  for (const o of [].concat(node.offers ?? [])) {
    if (!o || typeof o !== 'object') continue;
    for (const child of [].concat(o.offers ?? [])) {
      if (child && typeof child === 'object') out.push(toOffer(child, variant, o.priceCurrency));
    }
    out.push(toOffer(o, variant));
  }
  for (const v of [].concat(node.hasVariant ?? [])) if (v && typeof v === 'object') out.push(...ldOffers(v, v));
  return out.filter((o) => o.price != null);
}

// priceSpecification may be one object or a list (ListPrice + SalePrice); list/strikethrough prices are not what the shopper pays.
function specOf(o) {
  const specs = [].concat(o.priceSpecification ?? []).filter((s) => s && typeof s === 'object');
  const paid = specs.filter((s) => !/listprice|strikethrough|msrp/i.test(String(s.priceType ?? '')));
  const priced = (paid.length ? paid : specs).filter((s) => parseAmount(s.price) > 0);
  return priced.reduce((a, b) => (a && parseAmount(a.price) <= parseAmount(b.price) ? a : b), null);
}

function toOffer(o, variant, parentCurrency = null) {
  const spec = specOf(o);
  const own = parseAmount(o.price);
  return {
    price: own > 0 ? own : parseAmount(spec?.price) ?? parseAmount(o.lowPrice) ?? own,
    currency: o.priceCurrency ?? spec?.priceCurrency ?? parentCurrency ?? null,
    availability: String(o.availability ?? ''),
    url: o.url ?? variant?.url ?? null,
    sku: o.sku ?? variant?.sku ?? null,
    variant,
  };
}

const outOfStock = (o) => /outofstock|soldout|discontinued/i.test(o.availability);

// The offer for the variant in the link if one matches, otherwise the lowest price among those in stock (all of them if none is).
function pickOffer(offers, url) {
  if (!offers.length) return null;
  const here = canonicalUrl(url.href);
  const params = new Set([...url.searchParams.values(), ...url.pathname.split('/')].filter((s) => s.length >= 3));
  const match = offers.find((o) => {
    if (o.url) {
      try {
        if (canonicalUrl(new URL(o.url, url).href) === here) return true;
      } catch {}
    }
    return o.sku != null && params.has(String(o.sku));
  });
  const buyable = offers.filter((o) => !outOfStock(o));
  return match ?? (buyable.length ? buyable : offers).reduce((a, b) => (b.price < a.price ? b : a));
}

function firstImage(image) {
  const first = [].concat(image ?? [])[0];
  return (typeof first === 'string' ? first : first?.url ?? first?.contentUrl) ?? null;
}

const WRAPPER_KEYS = ['@graph', 'object', 'mainEntity'];

function* walk(node) {
  if (Array.isArray(node)) for (const n of node) yield* walk(n);
  else if (node && typeof node === 'object') {
    yield node;
    // A page may wrap the product: {"@graph": [...]}, or an action/page around it (MediaMarkt: BuyAction.object).
    for (const key of WRAPPER_KEYS) if (node[key]) yield* walk(node[key]);
  }
}


// ---- json-ld-list: a category or search page whose JSON-LD is an ItemList of products (Akakçe /ekran-karti/rtx-5070.html) ----
// There is no single product here, so the page is tracked at its lowest listed price, named after the page itself.

function jsonLdListing({ $, url }) {
  const prices = [];
  let image = null;
  let currency = null;
  let inStock = false;
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    let data;
    try {
      data = JSON.parse($(el).text());
    } catch {
      continue;
    }
    for (const list of walk(data)) {
      if (![].concat(list['@type'] ?? []).includes('ItemList')) continue;
      for (const entry of [].concat(list.itemListElement ?? [])) {
        const item = entry?.item && typeof entry.item === 'object' ? entry.item : entry;
        if (!item || typeof item !== 'object' || ![].concat(item['@type'] ?? []).includes('Product')) continue;
        const offer = pickOffer(ldOffers(item), url);
        if (!offer) continue;
        prices.push(offer.price);
        image ??= firstImage(item.image);
        currency ??= offer.currency;
        inStock ||= !/outofstock|soldout|discontinued/i.test(offer.availability);
      }
    }
  }
  if (!prices.length) return null;
  const meta = metaReader($);
  const heading = (meta('og:title') ?? $('title').first().text()).split(/\s+[|–-]\s+/)[0].trim();
  return {
    name: heading || null,
    image,
    price: Math.min(...prices),
    currency,
    availability: inStock ? null : 'OutOfStock',
  };
}

// ---- microdata: itemprop="price" in the content attribute or in the element's text ----

function microdataProduct({ $ }) {
  for (const prop of ['price', 'lowPrice']) {
    for (const el of $(`[itemprop="${prop}"]`).toArray()) {
      const node = $(el);
      const price = parseAmount(node.attr('content') ?? node.text());
      if (price == null) continue;
      const scope = node.closest('[itemscope][itemtype*="Product" i]');
      const name = scope.length ? scope.find('[itemprop="name"]').first() : null;
      const image = scope.length ? scope.find('[itemprop="image"]').first() : null;
      return {
        name: (name?.attr('content') ?? name?.text())?.trim() || null,
        image: image?.attr('content') ?? image?.attr('src') ?? image?.attr('href') ?? null,
        price,
        currency: null,
        availability: null,
      };
    }
  }
  return null;
}

// ---- meta: Open Graph / Facebook product tags ----

function metaProduct({ $ }) {
  const meta = metaReader($);
  const price = parseAmount(meta('product:price:amount') ?? meta('og:price:amount') ?? meta('price'));
  return price == null ? null : { name: null, image: null, price, currency: null, availability: null };
}

// ---- embedded-state: the JSON many shops put in the page for their own JavaScript ----

const STATE_IDS = ['__NEXT_DATA__', '__NUXT_DATA__'];
const STATE_VARS = [
  '__PRODUCT_DETAIL_APP_INITIAL_STATE__',
  '__envoy_product-detail__PROPS',
  '__INITIAL_STATE__',
  '__PRELOADED_STATE__',
  '__NUXT__',
];
const PRICE_KEYS = ['discountedPrice', 'sellingPrice', 'salePrice', 'currentPrice', 'finalPrice', 'price'];
const CURRENCY_KEYS = ['currency', 'currencyCode', 'priceCurrency'];

function embeddedStateProduct({ $, html }) {
  for (const state of embeddedStates($, html)) {
    const found = findPriceInTree(state);
    if (found) return found;
  }
  return null;
}

function* embeddedStates($, html) {
  for (const id of STATE_IDS) {
    const text = $(`script#${id}`).first().text();
    if (text) yield* parseJson(text);
  }
  for (const name of STATE_VARS) {
    // window.NAME = {...}  or  window["NAME"] = {...}
    const re = new RegExp(`(?:window\\.|window\\[["'])${name.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}(?:["']\\])?\\s*=\\s*`, 'g');
    for (const m of html.matchAll(re)) {
      const json = balancedJson(html, m.index + m[0].length);
      if (json) yield* parseJson(json);
    }
  }
}

function* parseJson(text) {
  try {
    yield JSON.parse(text);
  } catch {}
}

// The {...} that starts at `start`, found by counting braces outside strings.
function balancedJson(text, start) {
  if (text[start] !== '{') return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length && i < start + 2_000_000; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

// Subtrees that hold prices of things other than the product itself.
const NON_PRODUCT_KEYS = /shipping|cargo|delivery|installment|taksit|kargo|coupon|voucher|recommend|related|similar|cross|upsell|carousel|banner|bundle/i;

// Breadth first, so the product's own price is found before prices of related products deeper down.
// Skips shipping/installment/recommendation subtrees, and within one depth prefers a node that has a name.
function findPriceInTree(root) {
  let level = [root];
  for (let seen = 0; level.length && seen < 50_000; ) {
    const next = [];
    let fallback = null;
    for (const node of level) {
      seen++;
      if (!node || typeof node !== 'object') continue;
      if (!Array.isArray(node)) {
        for (const key of PRICE_KEYS) {
          if (!(key in node)) continue;
          const { price, holder } = stateAmount(node[key]);
          if (price == null) continue;
          const found = {
            name: typeof node.name === 'string' ? node.name : null,
            image: firstImage(node.image ?? node.images),
            price,
            currency: stateCurrency(holder) ?? stateCurrency(node[key]) ?? stateCurrency(node),
            availability: node.inStock === false || node.isSoldOut === true ? 'OutOfStock' : null,
          };
          if (found.name) return found;
          fallback ??= found;
          break;
        }
      }
      for (const [key, child] of Object.entries(node)) if (!NON_PRODUCT_KEYS.test(key)) next.push(child);
    }
    if (fallback) return fallback;
    level = next;
  }
  return null;
}

// 1299.9, "1.299,90 TL", { value: 1299.9 }, { amount: "1299.90" }, { sellingPrice: {...} }
function stateAmount(value, depth = 0) {
  if (typeof value === 'number') return { price: parseAmount(value), holder: null };
  if (typeof value === 'string') return { price: /^\D{0,4}\d[\d.,\s]*\D{0,4}$/.test(value.trim()) ? parseAmount(value) : null, holder: null };
  if (value && typeof value === 'object' && !Array.isArray(value) && depth < 2) {
    for (const key of ['value', 'amount', ...PRICE_KEYS, 'text']) {
      if (!(key in value)) continue;
      const inner = stateAmount(value[key], depth + 1);
      if (inner.price != null) return { price: inner.price, holder: inner.holder ?? value };
    }
  }
  return { price: null, holder: null };
}

function stateCurrency(node) {
  if (!node || typeof node !== 'object') return null;
  for (const key of CURRENCY_KEYS) {
    const v = node[key];
    if (typeof v === 'string' && /^[A-Za-z]{3}$/.test(v.trim())) return v.trim();
    if (v === 'TL' || v === '₺') return 'TRY';
  }
  return null;
}

// ---- shop adapters: for shops whose pages carry none of the above ----

const textOf = ($, selectors) => {
  for (const sel of selectors) {
    const el = $(sel).first();
    const v = (el.attr('content') ?? el.attr('value') ?? el.text())?.trim();
    if (v) return v;
  }
  return null;
};

export const SHOP_ADAPTERS = [
  {
    name: 'trendyol',
    match: (host) => /(^|\.)trendyol\.com$/.test(host),
    extract($) {
      const price = parseAmount(textOf($, ['.product-price-container .prc-dsc', '.prc-dsc', '.product-price-container .prc-org', '.price-view-discounted', '.price-view-original']));
      if (price == null) return null;
      return {
        name: textOf($, ['h1.pr-new-br', 'h1[data-testid="product-title"]', 'h1']),
        image: $('.base-product-image img, .gallery-container img').first().attr('src') ?? null,
        price,
        currency: 'TRY',
        availability: $('.sold-out, .notify-me-button').length ? 'OutOfStock' : null,
      };
    },
  },
  {
    name: 'hepsiburada',
    match: (host) => /(^|\.)hepsiburada\.com$/.test(host),
    extract($, html) {
      let price = parseAmount(textOf($, ['[data-test-id="price-current-price"]', '[data-test-id="default-price"] span', '#offering-price']));
      // Older pages keep the price only in the analytics object: "product_prices":["1299.90"]
      if (price == null) price = parseAmount(html.match(/"product_prices"\s*:\s*\[\s*"([^"]+)"/)?.[1]);
      if (price == null) return null;
      return {
        name: textOf($, ['h1[data-test-id="title"]', '#product-name', 'h1']),
        image: $('img.product-image, [data-test-id="product-image"] img').first().attr('src') ?? null,
        price,
        currency: 'TRY',
        availability: /tükendi|stokta yok/i.test(textOf($, ['[data-test-id="out-of-stock"]', '.out-of-stock']) ?? '') ? 'OutOfStock' : null,
      };
    },
  },
  {
    name: 'amazon',
    match: (host) => /(^|\.)amazon\.[a-z.]+$/.test(host),
    extract($, _html, url) {
      const price = parseAmount(
        textOf($, [
          '#corePrice_feature_div .a-price .a-offscreen',
          '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
          '#priceblock_dealprice',
          '#priceblock_ourprice',
          '#attach-base-product-price',
          '.a-price .a-offscreen',
        ]),
      );
      if (price == null) return null;
      const img = $('#landingImage, #imgBlkFront').first();
      return {
        name: textOf($, ['#productTitle']),
        image: img.attr('data-old-hires') || img.attr('src') || null,
        price,
        currency: textOf($, ['#attach-currency-of-preference']) ?? amazonCurrency(url.hostname),
        availability: /currently unavailable|şu anda mevcut değil|derzeit nicht verfügbar/i.test(textOf($, ['#availability']) ?? '') ? 'OutOfStock' : null,
      };
    },
  },
  {
    name: 'n11',
    match: (host) => /(^|\.)n11\.com$/.test(host),
    extract($) {
      const price = parseAmount(textOf($, ['.newPrice ins', '.unf-p-summary-price', '.priceContainer .newPrice', '.price-current']));
      if (price == null) return null;
      return {
        name: textOf($, ['h1.proName', 'h1.title', 'h1']),
        image: $('.imgObj img, .unf-p-img-box img').first().attr('data-original') ?? $('.imgObj img, .unf-p-img-box img').first().attr('src') ?? null,
        price,
        currency: 'TRY',
        availability: $('.unf-p-summary-out-of-stock, .outOfStock').length ? 'OutOfStock' : null,
      };
    },
  },
];

function amazonCurrency(host) {
  const tld = host.replace(/^.*amazon\./, '');
  return { 'com.tr': 'TRY', com: 'USD', ca: 'CAD', 'co.uk': 'GBP', de: 'EUR', fr: 'EUR', it: 'EUR', es: 'EUR', nl: 'EUR', 'co.jp': 'JPY', in: 'INR', ae: 'AED', sa: 'SAR', pl: 'PLN', se: 'SEK', 'com.au': 'AUD', 'com.br': 'BRL', 'com.mx': 'MXN' }[tld] ?? null;
}

// "1.299,90", "1,299.90", "₺1.299", 1299.9 -> 1299.9
export function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  let s = value.replace(/[^\d.,]/g, '');
  if (!s) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = lastDot > lastComma ? '.' : ',';
    s = s.split(dec === '.' ? ',' : '.').join('').replace(',', '.');
  } else {
    const sep = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : null;
    // One separator followed by exactly three digits is a thousands separator ("1.299") only when the leading group is 1-3 digits
    // without a leading zero; "1299.900", "0.999" and "0,500" are decimals.
    const thousands = sep && (s.split(sep).length > 2 || (s.length - s.lastIndexOf(sep) - 1 === 3 && /^[1-9]\d{0,2}$/.test(s.slice(0, s.lastIndexOf(sep)))));
    if (thousands) s = s.split(sep).join('');
    else if (sep) s = s.replace(sep, '.');
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Same product, different tracking params, should be one row.
const TRACKING_PARAM =
  /^(utm_|gad_|gclid$|gclsrc$|dclid$|gbraid$|wbraid$|fbclid$|msclkid$|yclid$|ttclid$|igshid$|srsltid$|mc_cid$|mc_eid$|_gl$|ref$|ref_|boutiqueId$|merchantId$)/i;

export function canonicalUrl(url) {
  const u = new URL(url);
  u.hash = '';
  // Amazon: every product has one short address, /dp/<ASIN>; titles in the path and search params vary.
  const asin = /(^|\.)amazon\.[a-z.]+$/.test(u.hostname) && u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1];
  if (asin) return `${u.origin}/dp/${asin.toUpperCase()}`;
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
  }
  return u.href;
}
