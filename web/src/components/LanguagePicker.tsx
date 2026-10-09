"use client";

import { useI18n } from "@/i18n/client";
import { LOCALE_CODES, LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/config";

// Swaps the language segment of the current address and remembers the choice for a year.
export function LanguagePicker() {
  const { lang, t } = useI18n();

  function change(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const rest = location.pathname.replace(/^\/[^/]+/, "");
    // Full load: the whole page, <html lang> and dir included, switches language at once.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.assign(`/${next}${rest}${location.search}${location.hash}`);
  }

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{t.nav.language}</span>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute start-2.5 size-4 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden
      >
        <circle cx="10" cy="10" r="7.5" />
        <path d="M2.5 10h15M10 2.5c2 2.2 3 4.7 3 7.5s-1 5.3-3 7.5c-2-2.2-3-4.7-3-7.5s1-5.3 3-7.5z" />
      </svg>
      <select
        value={lang}
        onChange={(e) => change(e.target.value as Locale)}
        className="h-9 max-w-36 cursor-pointer appearance-none rounded-lg border border-line bg-card ps-8 pe-3 text-sm text-ink hover:bg-hover focus:border-accent focus:outline-none"
      >
        {LOCALE_CODES.map((code) => (
          <option key={code} value={code}>
            {LOCALES[code].name}
          </option>
        ))}
      </select>
    </label>
  );
}
