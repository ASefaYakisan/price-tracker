"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";

export function BackLink({ className = "" }: { className?: string }) {
  const { t, href } = useI18n();
  return (
    <Link href={href("/")} className={`inline-flex items-center gap-1 text-sm text-muted hover:text-ink ${className}`}>
      <span aria-hidden className="inline-block rtl:rotate-180">
        ←
      </span>
      {t.common.allItems}
    </Link>
  );
}
