import type { MetadataRoute } from "next";
import { LOCALE_CODES } from "@/i18n/config";
import { getProducts } from "@/lib/data";
import { productSitemap } from "@/lib/product-seo";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const languages = Object.fromEntries(LOCALE_CODES.map((lang) => [lang, new URL(`/${lang}`, siteUrl()).href]));
  return [
    ...LOCALE_CODES.map((lang) => ({ url: languages[lang], alternates: { languages } })),
    ...productSitemap(await getProducts(), siteUrl()),
  ];
}
