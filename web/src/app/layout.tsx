import type { Metadata } from "next";
import Link from "next/link";
import { AlertsLink } from "@/components/AlertsLink";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "Price Tracker",
  description: "Daily price tracking dashboard powered by a Node.js scraper and Supabase",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line bg-card">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-ink" aria-hidden>
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 11l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Price Tracker
            </Link>
            <AlertsLink />
            <a href="/docs" className="text-sm text-muted hover:text-ink">
              API
            </a>
            <a
              href="https://github.com/ASefaYakisan/price-tracker"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted hover:text-ink"
            >
              Source on GitHub
            </a>
            <UserMenu />
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-xs text-faint">
          Built with Node.js, Supabase and Next.js. Data: books.toscrape.com (a public scraping sandbox), CoinGecko, Central Bank of the
          Republic of Türkiye and fawazahmed0/exchange-api. Updated daily.
        </footer>
      </body>
    </html>
  );
}
