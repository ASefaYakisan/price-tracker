"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/i18n/client";

// Unexpected failures (for example a database outage) keep the site frame and offer a retry.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t, href } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-start px-4 py-16 sm:py-24">
      <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-4xl">{t.errors.errorTitle}</h1>
      <p className="mt-3 text-base text-pretty text-muted">{t.errors.errorText}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:opacity-90"
        >
          {t.errors.retry}
        </button>
        <Link href={href("/")} className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-hover">
          {t.common.allItems}
        </Link>
      </div>
    </main>
  );
}
