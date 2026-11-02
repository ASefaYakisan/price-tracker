import type { MetadataRoute } from "next";
import type { ProductRow } from "./data.ts";
import { DEFAULT_LOCALE, LOCALE_CODES } from "../i18n/config.ts";

export function productLanguages(id: number, origin: URL) {
  return Object.fromEntries(LOCALE_CODES.map((lang) => [lang, new URL(`/${lang}/products/${id}`, origin).href]));
}

export function productSitemap(products: readonly (ProductRow | null)[], origin: URL): MetadataRoute.Sitemap {
  // Reserve space for home pages below the 50,000-URL sitemap limit; never emit over 40,000 products.
  return products
    .filter((p): p is ProductRow => p != null && p.source !== "custom" && Number.isInteger(p.id) && p.id > 0 && p.price != null && Number.isFinite(p.price) && p.price >= 0)
    .slice(0, 40_000)
    .map((p) => {
      const languages = productLanguages(p.id, origin);
      return { url: languages[DEFAULT_LOCALE], alternates: { languages } };
    });
}

export function productJsonLd(product: ProductRow, pageUrl: string): string {
  const hasOffer = product.price != null && Number.isFinite(product.price) && product.price >= 0 && product.currency;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url: pageUrl,
    ...(product.image_url ? { image: product.image_url } : {}),
    ...(hasOffer ? {
      offers: {
        "@type": "Offer",
        url: product.url,
        price: product.price,
        priceCurrency: product.currency,
        ...(product.in_stock == null ? {} : {
          availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        }),
      },
    } : {}),
  }).replace(/</g, "\\u003c");
}
