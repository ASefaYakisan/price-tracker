"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// A link still waiting for its first price: re-reads the page every few seconds for a couple of minutes,
// so the price appears without the visitor reloading. It unmounts as soon as the price is there.
export function AutoRefresh({ every = 10_000, times = 12 }: { every?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let left = times;
    const timer = setInterval(() => {
      if (document.hidden) return; // do not poll from a background tab
      router.refresh();
      if (--left <= 0) clearInterval(timer);
    }, every);
    return () => clearInterval(timer);
  }, [router, every, times]);
  return null;
}
