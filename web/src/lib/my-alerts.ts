"use client";

import { useSyncExternalStore } from "react";

// Alerts are write-only on the server (nobody can list other people's emails),
// so each browser remembers the alerts it created to show them back to the visitor.
export type SavedAlert = {
  productId: number;
  title: string;
  email: string;
  target: number;
  currency: string | null;
  createdAt: string;
  // Returned by the server; needed to edit or delete the alert. Older entries lack them.
  id?: number;
  token?: string;
};

const KEY = "price-tracker:alerts";
const EMPTY: SavedAlert[] = [];
let cache: SavedAlert[] | null = null;
const listeners = new Set<() => void>();

function read(): SavedAlert[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

const sameAlert = (a: SavedAlert, b: SavedAlert) =>
  a.id != null && b.id != null ? a.id === b.id : a.productId === b.productId && a.email.toLowerCase() === b.email.toLowerCase();

export function saveAlert(alert: SavedAlert) {
  // One entry per item and address, like the server: a new target replaces the old one.
  const same = (a: SavedAlert) => a.productId === alert.productId && a.email.toLowerCase() === alert.email.toLowerCase();
  write([alert, ...read().filter((a) => !same(a) && !sameAlert(a, alert))].slice(0, 50));
}

// Replace one entry in place (after an edit, or when the server hands back a token).
export function replaceAlert(old: SavedAlert, next: SavedAlert) {
  write(read().map((a) => (a === old || sameAlert(a, old) ? next : a)));
}

export function removeAlert(alert: SavedAlert) {
  write(read().filter((a) => a !== alert && !sameAlert(a, alert)));
}

function write(next: SavedAlert[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private mode or storage full: the alert is still saved on the server.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMyAlerts(productId?: number) {
  const all = useSyncExternalStore(subscribe, read, () => EMPTY);
  return productId == null ? all : all.filter((a) => a.productId === productId);
}
