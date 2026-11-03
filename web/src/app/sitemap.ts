import type { MetadataRoute } from "next";
import { LOCALE_CODES } from "@/i18n/config";
import { getProducts } from "@/lib/data";
import { productSitemap } from "@/lib/product-seo";
import { localeAlternates } from "@/lib/locale-alternates";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const languages = localeAlternates("", siteUrl());
  const staticPage = (path: string) => {
    const langs = localeAlternates(path, siteUrl());
    return LOCALE_CODES.map((lang) => ({ url: langs[lang], alternates: { languages: langs } }));
  };
  return [
    ...LOCALE_CODES.map((lang) => ({ url: languages[lang], alternates: { languages } })),
    ...staticPage("how-to-add"),
    ...staticPage("privacy"),
    ...staticPage("terms"),
    ...productSitemap(await getProducts(), siteUrl()),
  ];
}
