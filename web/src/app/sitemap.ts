import type { MetadataRoute } from "next";
import { LOCALE_CODES } from "@/i18n/config";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LOCALE_CODES.map((lang) => [lang, new URL(`/${lang}`, siteUrl()).href]));
  return LOCALE_CODES.map((lang) => ({ url: languages[lang], alternates: { languages } }));
}
