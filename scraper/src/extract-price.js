// Reads the price from any shop's product page using the structured data most shops publish
// for Google Shopping: JSON-LD Product/Offer first, then price meta tags.
// web/src/lib/extract-price.ts is a TypeScript port of this file; keep them in step.
import * as cheerio from 'cheerio';

export function extractProduct(html, pageUrl) {
  const $ = cheerio.load(html);
  const fromLd = jsonLdProduct($);
  const meta = (key) => $(`meta[property="${key}"], meta[name="${key}"], meta[itemprop="${key}"]`).first().attr('content')?.trim();

  const price =
    fromLd?.price ??
    parseAmount(meta('product:price:amount') ?? meta('og:price:amount') ?? $('[itemprop="price"]').first().attr('content') ?? meta('price'));
  if (price == null) return null;

  const currency =
    fromLd?.currency ?? meta('product:price:currency') ?? meta('og:price:currency') ?? $('[itemprop="priceCurrency"]').first().attr('content') ?? null;
  const availability = fromLd?.availability ?? meta('product:availability') ?? $('[itemprop="availability"]').first().attr('href') ?? '';
  const image = fromLd?.image ?? meta('og:image') ?? null;

  return {
    external_id: canonicalUrl(pageUrl),
    title: (fromLd?.name ?? meta('og:title') ?? $('title').first().text()).trim().slice(0, 300) || canonicalUrl(pageUrl),
    url: pageUrl,
    image_url: image ? new URL(image, pageUrl).href : null,
    price,
    currency: currency ? currency.toUpperCase() : null,
    in_stock: !/outofstock|out of stock|soldout|discontinued/i.test(availability),
    rating: null,
  };
}

function jsonLdProduct($) {
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
      const offer = [].concat(node.offers ?? [])[0];
      const price = parseAmount(offer?.price ?? offer?.lowPrice ?? offer?.priceSpecification?.price);
      if (price == null) continue;
      return {
        name: typeof node.name === 'string' ? node.name : null,
        image: [].concat(node.image ?? [])[0]?.url ?? [].concat(node.image ?? [])[0] ?? null,
        price,
        currency: offer.priceCurrency ?? offer.priceSpecification?.priceCurrency ?? null,
        availability: String(offer.availability ?? ''),
      };
    }
  }
  return null;
}

function* walk(node) {
  if (Array.isArray(node)) for (const n of node) yield* walk(n);
  else if (node && typeof node === 'object') {
    yield node;
    if (node['@graph']) yield* walk(node['@graph']);
  }
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
    // One separator followed by exactly three digits is a thousands separator ("1.299"), otherwise decimal.
    if (sep && (s.split(sep).length > 2 || s.length - s.lastIndexOf(sep) - 1 === 3)) s = s.split(sep).join('');
    else if (sep) s = s.replace(sep, '.');
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Same product, different tracking params, should be one row.
export function canonicalUrl(url) {
  const u = new URL(url);
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|gclid|fbclid|ref$|ref_|boutiqueId|merchantId$)/i.test(key)) u.searchParams.delete(key);
  }
  return u.href;
}
