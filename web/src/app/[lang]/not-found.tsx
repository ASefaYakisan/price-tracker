"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";

// Shown for unknown addresses and for products that no longer exist, inside the normal site header.
export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-start px-4 py-16 sm:py-24">
      <p className="text-sm font-semibold text-accent tabular-nums">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance sm:text-4xl">{t.errors.notFoundTitle}</h1>
      <p className="mt-3 text-base text-pretty text-muted">{t.errors.notFoundText}</p>
      <Link
        href={href("/")}
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:opacity-90"
      >
        {t.common.allItems}
      </Link>
    </main>
  );
}
