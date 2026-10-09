"use client";

import { createContext, useContext } from "react";
import { fill, type Locale } from "./config";
import type { Dict } from "./dictionaries/en";

const I18n = createContext<{ lang: Locale; t: Dict } | null>(null);

export function I18nProvider({ lang, dict, children }: { lang: Locale; dict: Dict; children: React.ReactNode }) {
  return <I18n.Provider value={{ lang, t: dict }}>{children}</I18n.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18n);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  const { lang, t } = ctx;
  return {
    lang,
    t,
    fill,
    // App paths carry the language: href("/alerts") -> "/tr/alerts".
    href: (path: string) => `/${lang}${path === "/" ? "" : path}`,
    // The API answers in English; show the translation when there is one.
    apiError: (message: string | undefined) => (message ? ((t.api as Record<string, string>)[message] ?? message) : t.common.genericError),
  };
}
