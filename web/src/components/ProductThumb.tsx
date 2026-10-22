"use client";

import { useState } from "react";
import type { ProductRow } from "@/lib/data";

// Product photo first; a shop's favicon when there is none; a small source icon as the last resort.
type Thumbable = Pick<ProductRow, "image_url" | "source"> & { url?: string };

export function ProductThumb({ product: p, large = false }: { product: Thumbable; large?: boolean }) {
  const candidates = [p.image_url, p.source === "custom" && p.url ? favicon(p.url) : null].filter((u): u is string => !!u);
  const [failed, setFailed] = useState(0);
  const src = candidates[failed];
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden border border-line bg-card text-muted ${
        large ? "size-24 rounded-xl p-2 sm:size-28" : "size-12 rounded-lg"
      }`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- small remote thumbnails, no optimisation needed
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed((n) => n + 1)}
          className={src === p.image_url ? "size-full object-contain" : large ? "size-10" : "size-6"}
        />
      ) : (
        <svg viewBox="0 0 24 24" className={large ? "size-9" : "size-5"} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {SOURCE_ICONS[p.source] ?? SOURCE_ICONS.custom}
        </svg>
      )}
    </span>
  );
}

function favicon(url: string) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
  } catch {
    return null;
  }
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  "books-toscrape": <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2zM12 6.5v13" />,
  coingecko: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M10 8.5h3a1.75 1.75 0 010 3.5h-3m0 0h3.5a1.75 1.75 0 010 3.5H10m0-7v7M11 7v1.5M11 15.5V17" />
    </>
  ),
  tcmb: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </>
  ),
  gold: <path d="M4 18h16l-2.5-7h-11zM8 11l1.5-4h5l1.5 4" />,
  custom: (
    <>
      <path d="M3.5 12.6V5a1.5 1.5 0 011.5-1.5h7.6a1.5 1.5 0 011 .4l7.4 7.4a1.5 1.5 0 010 2.1l-7.6 7.6a1.5 1.5 0 01-2.1 0l-7.4-7.4a1.5 1.5 0 01-.4-1z" />
      <circle cx="8" cy="8" r="1.3" />
    </>
  ),
};
