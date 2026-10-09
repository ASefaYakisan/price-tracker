"use client";

import Link from "next/link";
import { BellIcon } from "@/components/BellIcon";
import { useVisibleAlerts } from "@/lib/account-alerts";
import { useI18n } from "@/i18n/client";

export function AlertsLink() {
  const count = useVisibleAlerts().length;
  const { t, href } = useI18n();
  return (
    <Link href={href("/alerts")} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-muted hover:bg-hover hover:text-ink">
      <BellIcon filled={count > 0} className={count > 0 ? "size-4 text-accent" : "size-4"} />
      <span className="hidden sm:inline">{t.nav.alerts}</span>
      {count > 0 && <span className="rounded-full bg-accent px-1.5 text-xs font-medium tabular-nums text-accent-ink">{count}</span>}
    </Link>
  );
}
