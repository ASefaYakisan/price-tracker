"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { AlertStatus } from "@/lib/alert-status";
import { useUser } from "@/lib/auth";
import { read as readSaved, removeAlert, type SavedAlert, useMyAlerts } from "@/lib/my-alerts";

export type LiveAlert = Exclude<AlertStatus, { missing: true }>;

// Alerts saved to the signed-in account, shared by the header count, the bells and the alerts page.
let rows: LiveAlert[] | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function refreshAccountAlerts() {
  loading = (async () => {
    // Alerts made in this browser before signing in move into the account first.
    const local = readSaved().filter((a) => a.id && a.token);
    if (local.length) {
      const res = await fetch("/api/alerts/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alerts: local.map(({ id, token }) => ({ id, token })) }),
      }).catch(() => null);
      const json = await res?.json().catch(() => null);
      if (json?.ok) local.forEach((a) => removeAlert(a));
    }
    const res = await fetch("/api/alerts/mine").catch(() => null);
    const json = await res?.json().catch(() => null);
    rows = json?.ok ? json.alerts : [];
    notify();
  })();
  return loading;
}

export function clearAccountAlerts() {
  rows = null;
  loading = null;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccountAlerts() {
  const user = useUser();
  const data = useSyncExternalStore(
    subscribe,
    () => rows,
    () => null,
  );
  useEffect(() => {
    if (user && !loading) refreshAccountAlerts();
    if (user === null && rows) clearAccountAlerts();
  }, [user]);
  return { user, rows: data };
}

// One list for the header count, the bells and the product page:
// the account's alerts when signed in, otherwise the ones kept in this browser.
export function useVisibleAlerts(productId?: number): SavedAlert[] {
  const { user, rows } = useAccountAlerts();
  const local = useMyAlerts(productId);
  if (!user) return local;
  const mine = (rows ?? []).map(
    (r): SavedAlert => ({
      productId: r.productId,
      title: r.title,
      email: r.email,
      target: r.target,
      currency: r.currency,
      createdAt: r.createdAt,
      id: r.id,
      token: r.token,
    }),
  );
  return productId == null ? mine : mine.filter((a) => a.productId === productId);
}
