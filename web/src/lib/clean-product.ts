// Port of scraper/src/clean-product.js; keep them in step. Both run scraper/test/fixtures/clean-product-cases.json.

const SHOP_NAMES =
  "akak[cç]e|trendyol(?:\\s*-?\\s*milla)?|hepsiburada|n11|amazon(?:\\.[a-z.]+)?(?:\\s*t[uü]rkiye)?|vatan\\s*bilgisayar|mediamarkt(?:\\.com\\.tr)?|teknosa|boyner|lc\\s*waikiki|lcw|decathlon(?:\\s*t[uü]rkiye)?|itopya|ebay(?:\\.[a-z.]+)?|[a-z0-9-]+\\.(?:com|net|org)(?:\\.tr)?";
const SEPARATOR = "\\s*[|\\u2013\\u2014\\u00b7:]\\s*|\\s+-\\s+";
const TRAILING_SHOP = new RegExp(`(?:${SEPARATOR})(?:${SHOP_NAMES})\\s*$`, "i");
const LEADING_SHOP = new RegExp(`^(?:${SHOP_NAMES})(?:${SEPARATOR})`, "i");
const TRAILING_SALES_PHRASE = /(?:(?:\s*[|–—-]\s*|\s+)(?:en\s+uygun\s+)?(?:fiyat[ıi]?(?:lar[ıi])?|[öo]zellikleri|yorumlar[ıi]|sat[ıi]n\s+al|sipari[sş]\s+ver|kampanya(?:lar[ıi])?)(?:\s*(?:,|ve|&)\s*(?:fiyat\w*|[öo]zellikleri|yorumlar[ıi]|sat[ıi]n\s+al|incelemeleri|kampanyalar[ıi]))*)\s*$/i;
const LEADING_PHRASE = /^(?:en\s+ucuz|en\s+uygun|en\s+iyi\s+fiyat(?:l[ae]r)?)\s+/i;
const TRAILING_ID = /\s*[,;/]\s*\d{5,}\s*$/;

export function cleanTitle(raw: unknown): string {
  let t = String(raw ?? "").replace(/\s+/g, " ").trim();
  for (let i = 0; i < 4; i++) {
    const before = t;
    t = t
      .replace(TRAILING_ID, "")
      .replace(LEADING_PHRASE, "")
      .replace(TRAILING_SHOP, "")
      .replace(LEADING_SHOP, "")
      .replace(TRAILING_SALES_PHRASE, "")
      .replace(/^[\s,;:|\-–—]+|[\s,;:|\-–—]+$/g, "");
    if (t === before) break;
  }
  return fixCase(t);
}

function fixCase(title: string): string {
  const letters = title.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4) return title;
  const locale = /[çğıöşüİ]/i.test(title) ? "tr" : "en";
  const lower = title.toLocaleLowerCase(locale);
  const upper = title.toLocaleUpperCase(locale);
  if (title !== lower && title !== upper) return title;
  return lower.replace(/[^\s\-/()]+/gu, (word) => {
    if (/\p{L}/u.test(word) && /\d/.test(word) && word.length <= 6) return word.toLocaleUpperCase(locale);
    const first = word.match(/\p{L}/u);
    if (!first || first.index === undefined) return word;
    const at = first.index;
    return word.slice(0, at) + word[at].toLocaleUpperCase(locale) + word.slice(at + 1);
  });
}

const NOT_A_PRODUCT_IMAGE = /(?:^|[/_.\-@])(?:logo|logos|favicon|sprite|placeholder|no[-_]?image|noimage|default[-_]?(?:image|product)|blank|brand[-_]?image|og[-_]?default|icon|icons)(?:[/_.\-@]|\d|$)/i;

export function isProductImage(url: unknown): boolean {
  if (!url || typeof url !== "string") return false;
  if (/^data:/i.test(url)) return false;
  let path: string;
  try {
    path = decodeURI(new URL(url, "https://x.invalid").pathname);
  } catch {
    return false;
  }
  if (/\.(?:svg|ico|gif)$/i.test(path)) return false;
  return !NOT_A_PRODUCT_IMAGE.test(path);
}

export function pickImage(candidates: unknown[], base: string | URL): string | null {
  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate.trim() : "";
    if (!value || !isProductImage(value)) continue;
    try {
      return new URL(value, base).href;
    } catch {}
  }
  return null;
}
