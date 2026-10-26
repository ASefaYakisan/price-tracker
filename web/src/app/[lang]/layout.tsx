import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans } from "next/font/google";
import { AlertsLink } from "@/components/AlertsLink";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { APPEARANCE_SCRIPT } from "@/lib/appearance";
import { LanguagePicker } from "@/components/LanguagePicker";
import { UserMenu } from "@/components/UserMenu";
import { I18nProvider } from "@/i18n/client";
import { isRtl, intlLocale, LOCALE_CODES } from "@/i18n/config";
import { getDictionary, resolveLang } from "@/i18n/server";
import { siteUrl } from "@/lib/site-url";
import "../globals.css";

// Plex has tabular figures, so prices line up; scripts it lacks (Arabic, Thai, CJK...) fall back to the system font.
const plex = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext", "cyrillic", "greek", "vietnamese"],
  variable: "--font-plex",
  display: "swap",
});

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  return {
    title: t.meta.title,
    description: t.meta.description,
    metadataBase: siteUrl(),
    openGraph: {
      siteName: t.meta.title,
      title: t.meta.title,
      description: t.meta.description,
      locale: lang === "ar" ? "ar_AR" : intlLocale(lang).replace("-", "_"),
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  return (
    <html lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"} className={`h-full antialiased ${plex.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider lang={lang} dict={t}>
          <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4">
              <Link href={`/${lang}`} className="flex shrink-0 items-center gap-2 text-[17px] font-bold tracking-tight">
                <Logo />
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

// A price tag with a falling arrow: the one thing the site is about.
function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
      <path d="M4 7.5A3.5 3.5 0 017.5 4h9.1a3.5 3.5 0 012.5 1l8.4 8.4a3.5 3.5 0 010 5l-8.6 8.6a3.5 3.5 0 01-5 0L5 18.6a3.5 3.5 0 01-1-2.5z" className="fill-accent" />
      <circle cx="10" cy="10" r="2" className="fill-bg" />
      <path d="M17 11.5v8m0 0l-3.2-3.2M17 19.5l3.2-3.2" fill="none" className="stroke-accent-ink" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
