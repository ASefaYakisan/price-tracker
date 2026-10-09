// Supported languages: the code is the first URL segment (/tr/alerts), `name` is how speakers write it.
export const LOCALES = {
  en: { name: "English", intl: "en-GB" },
  tr: { name: "Türkçe", intl: "tr-TR" },
  de: { name: "Deutsch", intl: "de-DE" },
  fr: { name: "Français", intl: "fr-FR" },
  es: { name: "Español", intl: "es-ES" },
  pt: { name: "Português", intl: "pt-BR" },
  it: { name: "Italiano", intl: "it-IT" },
  nl: { name: "Nederlands", intl: "nl-NL" },
  pl: { name: "Polski", intl: "pl-PL" },
  sv: { name: "Svenska", intl: "sv-SE" },
  da: { name: "Dansk", intl: "da-DK" },
  ro: { name: "Română", intl: "ro-RO" },
  cs: { name: "Čeština", intl: "cs-CZ" },
  el: { name: "Ελληνικά", intl: "el-GR" },
  ru: { name: "Русский", intl: "ru-RU" },
  uk: { name: "Українська", intl: "uk-UA" },
  ar: { name: "العربية", intl: "ar-u-nu-latn", rtl: true },
  hi: { name: "हिन्दी", intl: "hi-IN" },
  zh: { name: "简体中文", intl: "zh-CN" },
  ja: { name: "日本語", intl: "ja-JP" },
  ko: { name: "한국어", intl: "ko-KR" },
  id: { name: "Bahasa Indonesia", intl: "id-ID" },
  vi: { name: "Tiếng Việt", intl: "vi-VN" },
  th: { name: "ไทย", intl: "th-TH" },
} as const satisfies Record<string, { name: string; intl: string; rtl?: true }>;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];
export const LOCALE_COOKIE = "lang";

export const isLocale = (value: string | undefined | null): value is Locale => !!value && Object.hasOwn(LOCALES, value);
export const intlLocale = (lang: Locale) => LOCALES[lang].intl;
export const isRtl = (lang: Locale) => "rtl" in LOCALES[lang];

// Best match for an Accept-Language header such as "tr-TR,tr;q=0.9,en;q=0.8".
export function negotiate(header: string | null): Locale {
  const wanted = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { code: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return (wanted.find((w) => isLocale(w.code))?.code as Locale | undefined) ?? DEFAULT_LOCALE;
}

// Fill {name} placeholders: fill("Hi {name}", { name: "Sefa" }).
export function fill(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}
