"use client";

import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { authEnabled, createClient } from "@/lib/supabase/client";

// The signed-in user for client components: undefined while loading, null when signed out.
let current: User | null | undefined = authEnabled ? undefined : null;
const listeners = new Set<() => void>();
let started = false;

function start() {
  if (started || !authEnabled) return;
  started = true;
  const supabase = createClient();
  supabase.auth.onAuthStateChange((_event, session) => {
    current = session?.user ?? null;
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUser() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => undefined,
  );
}
