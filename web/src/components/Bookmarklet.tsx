"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { bookmarklet } from "@/lib/bookmarklet";

// A link to drag to the bookmarks bar. React refuses javascript: in href, so it is set after mount,
// when the site's own address is known too.
export function Bookmarklet() {
  const { t, lang } = useI18n();
  const ref = useRef<HTMLAnchorElement>(null);
  const [tapped, setTapped] = useState(false);

  useEffect(() => {
    ref.current?.setAttribute("href", bookmarklet(location.origin, lang));
  }, [lang]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <a
        ref={ref}
        href="#"
        draggable
        onClick={(e) => {
          e.preventDefault();
          setTapped(true);
        }}
        className="inline-flex h-10 cursor-grab items-center gap-2 rounded-lg border-2 border-dashed border-accent px-4 text-sm font-semibold text-accent active:cursor-grabbing"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
          <path d="M5.5 3.5h9v13l-4.5-3.5-4.5 3.5z" />
        </svg>
        {t.track.submit}
      </a>
      <p className={`text-sm ${tapped ? "text-warn" : "text-muted"}`} role={tapped ? "status" : undefined}>
        {tapped ? t.howTo.bookmarkDragHint : t.howTo.bookmarkDrag}
      </p>
    </div>
  );
}
