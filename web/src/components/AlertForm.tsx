"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { saveAlert } from "@/lib/my-alerts";
import { MyAlerts } from "@/components/MyAlerts";

type State = { kind: "idle" | "saving" } | { kind: "done"; demo: boolean } | { kind: "error"; message: string };

export function AlertForm({
  productId,
  title,
  price,
  currency,
}: {
  productId: number;
  title: string;
  price: number | null;
  currency: string | null;
}) {
  // Suggest 5% under today's price, rounded to something a person would type.
  const suggested = price == null ? "" : String(Number((price * 0.95).toPrecision(price >= 1 ? 4 : 3)));
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState(suggested);
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "saving" });
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, email, targetPrice: Number(target) }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.ok) {
      if (!json.demo)
        saveAlert({
          productId,
          title,
          email,
          target: Number(target),
          currency,
          createdAt: new Date().toISOString(),
        });
      setState({ kind: "done", demo: Boolean(json.demo) });
    } else
      setState({
        kind: "error",
        message: json?.error ?? "Something went wrong. Please try again.",
      });
  }

  if (state.kind === "done") {
    return (
      <>
        <p className="rounded-lg bg-good-soft px-4 py-3 text-sm text-ink">
          Done. We will email <strong>{email}</strong> once the price is at or below <strong>{money(Number(target), currency)}</strong>.
          {state.demo && " (Demo mode: nothing is saved.)"}{" "}
          <button type="button" onClick={() => setState({ kind: "idle" })} className="font-medium text-accent hover:underline">
            Add another
          </button>
        </p>
        <MyAlerts productId={productId} title="Your alerts on this item" />
      </>
    );
  }

  const input =
    "h-10 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none";
  return (
    <>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted sm:w-44">
          Alert me at or below{currency ? ` (${currency})` : ""}
          <input
            type="number"
            required
            min="0"
            step="any"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={`${input} tabular-nums`}
          />
        </label>
        <button
          type="submit"
          disabled={state.kind === "saving"}
          className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {state.kind === "saving" ? "Saving…" : "Create alert"}
        </button>
        {state.kind === "error" && (
          <p role="alert" className="text-sm text-bad sm:basis-full">
            {state.message}
          </p>
        )}
      </form>
      <MyAlerts productId={productId} title="Your alerts on this item" />
    </>
  );
}
