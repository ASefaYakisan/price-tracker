import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import type { Dict } from "./dictionaries/en";

const loaders: Record<Locale, () => Promise<{ default: Dict }>> = {
  en: () => import("./dictionaries/en"),
  tr: () => import("./dictionaries/tr"),
  de: () => import("./dictionaries/de"),
  fr: () => import("./dictionaries/fr"),
  es: () => import("./dictionaries/es"),
  pt: () => import("./dictionaries/pt"),
  it: () => import("./dictionaries/it"),
  nl: () => import("./dictionaries/nl"),
  pl: () => import("./dictionaries/pl"),
  sv: () => import("./dictionaries/sv"),
  da: () => import("./dictionaries/da"),
  ro: () => import("./dictionaries/ro"),
  cs: () => import("./dictionaries/cs"),
  el: () => import("./dictionaries/el"),
  ru: () => import("./dictionaries/ru"),
  uk: () => import("./dictionaries/uk"),
  ar: () => import("./dictionaries/ar"),
  hi: () => import("./dictionaries/hi"),
  zh: () => import("./dictionaries/zh"),
  ja: () => import("./dictionaries/ja"),
  ko: () => import("./dictionaries/ko"),
  id: () => import("./dictionaries/id"),
  vi: () => import("./dictionaries/vi"),
  th: () => import("./dictionaries/th"),
};

export const getDictionary = async (lang: Locale) => (await loaders[lang]()).default;

// For pages: the [lang] segment, or a 404 for anything that is not a supported language.
export async function resolveLang(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}
