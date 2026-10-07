import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Price Tracker",
  description: "Daily price tracking dashboard powered by a Node.js scraper and Supabase",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 font-sans">{children}</body>
    </html>
  );
}
