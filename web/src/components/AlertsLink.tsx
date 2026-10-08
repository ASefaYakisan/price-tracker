"use client";

import Link from "next/link";
import { BellIcon } from "@/components/BellIcon";
import { useVisibleAlerts } from "@/lib/account-alerts";

export function AlertsLink() {
  const count = useVisibleAlerts().length;
  return (
    <Link href="/alerts" className="ml-auto flex items-center gap-1.5 text-sm text-muted hover:text-ink">
      <BellIcon filled={count > 0} className={count > 0 ? "size-4 text-accent" : "size-4"} />
      Alerts
      {count > 0 && <span className="rounded-full bg-accent px-1.5 text-xs font-medium tabular-nums text-accent-ink">{count}</span>}
    </Link>
  );
}
