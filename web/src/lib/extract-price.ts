// Reads the price from any shop's product page using the structured data most shops publish
// for Google Shopping: JSON-LD Product/Offer first, then price meta tags.
// Port of scraper/src/extract-price.js (the scraper re-checks these links daily); keep them in step.
import * as cheerio from "cheerio";

export type ExtractedProduct = {
  external_id: string;
  title: string;
  url: string;
  image_url: string | null;
  price: number;
  currency: string | null;
  in_stock: boolean;
  rating: null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export function extractProduct(html: string, pageUrl: string): ExtractedProduct | null {
  const $ = cheerio.load(html);
  const fromLd = jsonLdProduct($);
  const meta = (key: string) => $(`meta[property="${key}"], meta[name="${key}"], meta[itemprop="${key}"]`).first().attr('content')?.trim();

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

function jsonLdProduct($: cheerio.CheerioAPI) {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    let data: Json;
    try {
      data = JSON.parse($(el).text());
    } catch {
      continue;
    }
    for (const node of walk(data)) {
      const types: string[] = [].concat(node['@type'] ?? []);
      if (!types.includes('Product') && !types.includes('ProductGroup')) continue;
      const offer: Json = ([] as Json[]).concat(node.offers ?? [])[0];
      const price = parseAmount(offer?.price ?? offer?.lowPrice ?? offer?.priceSpecification?.price);
      if (price == null) continue;
      return {
        name: typeof node.name === 'string' ? node.name : null,
        image: (([] as Json[]).concat(node.image ?? [])[0]?.url ?? ([] as Json[]).concat(node.image ?? [])[0] ?? null) as string | null,
        price,
        currency: (offer.priceCurrency ?? offer.priceSpecification?.priceCurrency ?? null) as string | null,
        availability: String(offer.availability ?? ''),
      };
    }
  }
  return null;
}

function* walk(node: Json): Generator<Json> {
  if (Array.isArray(node)) for (const n of node) yield* walk(n);
  else if (node && typeof node === 'object') {
    yield node;
    if (node['@graph']) yield* walk(node['@graph']);
  }
}

// "1.299,90", "1,299.90", "₺1.299", 1299.9 -> 1299.9
export function parseAmount(value: unknown): number | null {
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
export function canonicalUrl(url: string) {
  const u = new URL(url);
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|gclid|fbclid|ref$|ref_|boutiqueId|merchantId$)/i.test(key)) u.searchParams.delete(key);
  }
  return u.href;
}
