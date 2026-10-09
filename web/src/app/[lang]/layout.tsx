import type { Metadata } from "next";
import Link from "next/link";
import { AlertsLink } from "@/components/AlertsLink";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { APPEARANCE_SCRIPT } from "@/lib/appearance";
import { LanguagePicker } from "@/components/LanguagePicker";
import { UserMenu } from "@/components/UserMenu";
import { I18nProvider } from "@/i18n/client";
import { isRtl, LOCALE_CODES } from "@/i18n/config";
import { getDictionary, resolveLang } from "@/i18n/server";
import "../globals.css";

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const t = await getDictionary(await resolveLang(params));
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: { languages: Object.fromEntries(LOCALE_CODES.map((l) => [l, `/${l}`])) },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  return (
    <html lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider lang={lang} dict={t}>
          <header className="sticky top-0 z-20 border-b border-line bg-card/90 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4">
              <Link href={`/${lang}`} className="flex shrink-0 items-center gap-2.5 font-semibold">
                <span
                  className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-teal text-white shadow-soft"
                  aria-hidden
                >
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 11l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="hidden sm:inline">{t.meta.title}</span>
              </Link>
              <nav className="ms-auto flex items-center gap-1 text-sm">
                <AlertsLink />
              </nav>
              <AppearanceMenu />
              <LanguagePicker />
              <UserMenu />
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-xs text-faint">{t.footer}</footer>
        </I18nProvider>
      </body>
    </html>
  );
}
