import { DEFAULT_LOCALE, LOCALE_CODES } from "../i18n/config.ts";

/** hreflang map for one page: every locale plus `x-default` (the default locale). `path` is "" for home. */
export function localeAlternates(path: string, origin?: URL): Record<string, string> {
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  const href = (lang: string) => (origin ? new URL(`/${lang}${suffix}`, origin).href : `/${lang}${suffix}`);
  return { ...Object.fromEntries(LOCALE_CODES.map((l) => [l, href(l)])), "x-default": href(DEFAULT_LOCALE) };
}
