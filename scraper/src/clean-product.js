// Tidies what a shop's page calls its product: the title (search-result wording, shop names, trailing ids) and the image
// (never a logo or placeholder). web/src/lib/clean-product.ts is a TypeScript port; both run
// test/fixtures/clean-product-cases.json, so a drift shows up as a failing test.

const SHOP_NAMES =
  'akak[cç]e|trendyol(?:\\s*-?\\s*milla)?|hepsiburada|n11|amazon(?:\\.[a-z.]+)?(?:\\s*t[uü]rkiye)?|vatan\\s*bilgisayar|mediamarkt(?:\\.com\\.tr)?|teknosa|boyner|lc\\s*waikiki|lcw|decathlon(?:\\s*t[uü]rkiye)?|itopya|ebay(?:\\.[a-z.]+)?|[a-z0-9-]+\\.(?:com|net|org)(?:\\.tr)?';
const SEPARATOR = '\\s*[|\\u2013\\u2014\\u00b7:]\\s*|\\s+-\\s+';
const TRAILING_SHOP = new RegExp(`(?:${SEPARATOR})(?:${SHOP_NAMES})\\s*$`, 'i');
const LEADING_SHOP = new RegExp(`^(?:${SHOP_NAMES})(?:${SEPARATOR})`, 'i');
// "... Fiyatı, Özellikleri ve Yorumları", "... Fiyatları", "... - Satın Al"
const TRAILING_SALES_PHRASE = /(?:(?:\s*[|–—-]\s*|\s+)(?:en\s+uygun\s+)?(?:fiyat[ıi]?(?:lar[ıi])?|[öo]zellikleri|yorumlar[ıi]|sat[ıi]n\s+al|sipari[sş]\s+ver|kampanya(?:lar[ıi])?)(?:\s*(?:,|ve|&)\s*(?:fiyat\w*|[öo]zellikleri|yorumlar[ıi]|sat[ıi]n\s+al|incelemeleri|kampanyalar[ıi]))*)\s*$/i;
const LEADING_PHRASE = /^(?:en\s+ucuz|en\s+uygun|en\s+iyi\s+fiyat(?:l[ae]r)?)\s+/i;
const TRAILING_ID = /\s*[,;/]\s*\d{5,}\s*$/;

export function cleanTitle(raw) {
  let t = String(raw ?? '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 4; i++) {
    const before = t;
    t = t
      .replace(TRAILING_ID, '')
      .replace(LEADING_PHRASE, '')
      .replace(TRAILING_SHOP, '')
      .replace(LEADING_SHOP, '')
      .replace(TRAILING_SALES_PHRASE, '')
      .replace(/^[\s,;:|\-–—]+|[\s,;:|\-–—]+$/g, '');
    if (t === before) break;
  }
  return fixCase(t);
}

// A title that is all one case is title-cased; a mixed-case title is how the shop wrote the name, so it stays.
function fixCase(title) {
  const letters = title.replace(/[^\p{L}]/gu, '');
  if (letters.length < 4) return title;
  const turkish = /[çğıöşüİ]/i.test(title);
  const locale = turkish ? 'tr' : 'en';
  const lower = title.toLocaleLowerCase(locale);
  const upper = title.toLocaleUpperCase(locale);
  if (title !== lower && title !== upper) return title;
  return lower.replace(/[^\s\-/()]+/gu, (word) => {
    // Model codes like "v3", "s25", "rtx5070" are written in capitals; plain numbers and units stay as they are.
    if (/\p{L}/u.test(word) && /\d/.test(word) && word.length <= 6) return word.toLocaleUpperCase(locale);
    const first = word.match(/\p{L}/u);
    if (!first) return word;
    const at = first.index;
    return word.slice(0, at) + word[at].toLocaleUpperCase(locale) + word.slice(at + 1);
  });
}

// Shop logos, icons and "no image" placeholders are not product pictures.
const NOT_A_PRODUCT_IMAGE = /(?:^|[/_.\-@])(?:logo|logos|favicon|sprite|placeholder|no[-_]?image|noimage|default[-_]?(?:image|product)|blank|brand[-_]?image|og[-_]?default|icon|icons)(?:[/_.\-@]|\d|$)/i;

export function isProductImage(url) {
  if (!url || typeof url !== 'string') return false;
  if (/^data:/i.test(url)) return false;
  let path;
  try {
    path = decodeURI(new URL(url, 'https://x.invalid').pathname);
  } catch {
    return false;
  }
  if (/\.(?:svg|ico|gif)$/i.test(path)) return false;
  return !NOT_A_PRODUCT_IMAGE.test(path);
}

// The first candidate that is a real product picture, as an absolute address; null when none is.
export function pickImage(candidates, base) {
  for (const candidate of candidates) {
    const value = typeof candidate === 'string' ? candidate.trim() : '';
    if (!value || !isProductImage(value)) continue;
    try {
      return new URL(value, base).href;
    } catch {}
  }
  return null;
}
