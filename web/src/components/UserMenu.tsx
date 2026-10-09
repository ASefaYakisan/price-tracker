"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearAccountAlerts } from "@/lib/account-alerts";
import { useUser } from "@/lib/auth";
import { authEnabled, createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/client";

export function UserMenu() {
  const user = useUser();
  const router = useRouter();
  const { t, href } = useI18n();
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
      <Link
        href={href("/login")}
        className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium whitespace-nowrap text-accent-ink hover:opacity-90"
      >
        {t.nav.signIn}
      </Link>
    );

  async function signOut() {
    await createClient().auth.signOut();
    clearAccountAlerts();
    setOpen(false);
    router.push(href("/"));
    router.refresh();
  }

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-accent to-teal text-sm font-semibold text-white"
        aria-label={t.nav.accountMenu}
        aria-expanded={open}
      >
        {initial}
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 w-56 rounded-xl border border-line bg-card p-1 text-sm shadow-lg">
          <div className="truncate px-3 py-2 text-xs text-muted">{user.email}</div>
          <Link href={href("/alerts")} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-ink hover:bg-hover">
            {t.nav.myAlerts}
          </Link>
          <button onClick={signOut} className="block w-full rounded-lg px-3 py-2 text-start text-bad hover:bg-bad-soft">
            {t.nav.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
