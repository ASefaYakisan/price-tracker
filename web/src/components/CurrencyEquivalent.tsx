"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { fill } from "@/i18n/config";
import { convertPrice, DISPLAY_CURRENCIES, type Rates } from "@/lib/convert";
import { money } from "@/lib/format";

const KEY = "display-currency";

// Lets a visitor see a price in their own currency next to the original one (kept in this browser only).
export function CurrencyEquivalent({
  price,
  currency,
  rates,
  lang,
  labels,
}: {
  price: number | null;
  currency: string | null;
  rates: Rates;
  lang: Locale;
  labels: { showIn: string; original: string; approx: string };
}) {
  const [choice, setChoice] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the browser-only preference after hydration
      if (saved) setChoice(saved);
    } catch {}
  }, []);

  const options = DISPLAY_CURRENCIES.filter((c) => rates[c] && c !== (currency ?? "USD").toUpperCase());
  if (price == null || options.length === 0) return null;
  const converted = choice ? convertPrice(price, currency, choice, rates) : null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <label className="flex items-center gap-2">
        <span>{labels.showIn}</span>
        <select
          value={choice}
          onChange={(e) => {
            setChoice(e.target.value);
            try {
              localStorage.setItem(KEY, e.target.value);
            } catch {}
          }}
          className="h-8 rounded-lg border border-line bg-card px-2 text-sm text-ink"
        >
          <option value="">{labels.original}</option>
          {options.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {converted != null && <span className="tabular-nums">{fill(labels.approx, { price: money(converted, choice, lang) })}</span>}
    </div>
  );
}
