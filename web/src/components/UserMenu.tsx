"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearAccountAlerts } from "@/lib/account-alerts";
import { useUser } from "@/lib/auth";
import { authEnabled, createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const user = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!authEnabled) return null;
  if (user === undefined) return <span className="h-8 w-16 animate-pulse rounded-lg bg-hover" />;
  if (!user)
    return (
      <Link href="/login" className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-hover">
        Sign in
      </Link>
    );

  async function signOut() {
    await createClient().auth.signOut();
    clearAccountAlerts();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid size-8 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-ink"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-line bg-card p-1 text-sm shadow-lg">
          <div className="truncate px-3 py-2 text-xs text-muted">{user.email}</div>
          <Link href="/alerts" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-ink hover:bg-hover">
            My alerts
          </Link>
          <button onClick={signOut} className="block w-full rounded-lg px-3 py-2 text-left text-bad hover:bg-bad-soft">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
