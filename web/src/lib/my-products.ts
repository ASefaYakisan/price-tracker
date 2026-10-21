"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useUser } from "@/lib/auth";

// Ids of the items in the signed-in visitor's list, shared by the home page and the product page.
let ids: ReadonlySet<number> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function refreshMyProducts() {
  loading = (async () => {
    const res = await fetch("/api/track/mine").catch(() => null);
    const json = await res?.json().catch(() => null);
    ids = new Set<number>(json?.ok ? json.ids : []);
    notify();
  })();
  return loading;
}

// After adding or removing on one page, the other pages see it without a reload.
export function setInMyProducts(id: number, inList: boolean) {
  if (!ids) return;
  const next = new Set(ids);
  if (inList) next.add(id);
  else next.delete(id);
  ids = next;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// null while loading or signed out, otherwise the ids in the list.
export function useMyProducts() {
  const user = useUser();
  const data = useSyncExternalStore(
    subscribe,
    () => ids,
    () => null,
  );
  useEffect(() => {
    if (user && !loading) refreshMyProducts();
    if (user === null && ids) {
      ids = null;
      loading = null;
      notify();
    }
  }, [user]);
  return { user, ids: user ? data : null };
}
