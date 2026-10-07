"use client";

import Link from "next/link";
import { MyAlerts } from "@/components/MyAlerts";
import { useMyAlerts } from "@/lib/my-alerts";

export function AlertsOverview() {
  if (useMyAlerts().length) return <MyAlerts title="All your alerts" />;
  return (
    <section className="rounded-xl border border-line bg-card p-6 text-sm text-muted">
      No alerts yet. Open any item from the{" "}
      <Link href="/" className="text-accent hover:underline">
        list
      </Link>{" "}
      and press the bell to get an email when its price reaches your target.
    </section>
  );
}
