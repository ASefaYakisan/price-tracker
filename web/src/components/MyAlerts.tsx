"use client";

import Link from "next/link";
import { money, shortDate } from "@/lib/format";
import { useVisibleAlerts } from "@/lib/account-alerts";
import { useUser } from "@/lib/auth";

// "Your alerts" list; on the product page it shows only that item's alerts.
export function MyAlerts({ productId, title = "Your alerts" }: { productId?: number; title?: string }) {
  const alerts = useVisibleAlerts(productId);
  const user = useUser();
  if (!alerts.length) return null;
  return (
    <section className={productId == null ? "mb-6 rounded-xl border border-line bg-card p-4" : "mt-4 border-t border-line pt-4"}>
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="mt-2 divide-y divide-line text-sm">
        {alerts.map((a) => (
          <li key={`${a.productId}-${a.email}-${a.createdAt}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            {productId == null ? (
              <Link href={`/products/${a.productId}`} className="font-medium text-ink hover:text-accent">
                {a.title}
              </Link>
            ) : (
              <span className="text-ink">{a.email}</span>
            )}
            <span className="text-muted">
              at or below <strong className="tabular-nums text-ink">{money(a.target, a.currency)}</strong>
              {productId == null && <> · {a.email}</>} · set {shortDate(a.createdAt)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-faint">
        {user ? "Saved to your account." : "Saved in this browser."} You get one email when the price reaches the target.
      </p>
    </section>
  );
}
