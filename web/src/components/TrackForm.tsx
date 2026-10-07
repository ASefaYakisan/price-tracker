"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/format";

type Preview = { title: string; price: number; currency: string | null };
type State =
  | { kind: "idle" | "saving" }
  | { kind: "demo"; product: Preview }
  | { kind: "error"; message: string };

export function TrackForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "saving" });
    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.id) {
      // Reset first: the browser can restore this page from history with its old state.
      setState({ kind: "idle" });
      setUrl("");
      router.push(`/products/${json.id}`);
      router.refresh();
    } else if (res?.ok && json?.demo) setState({ kind: "demo", product: json.product });
    else setState({ kind: "error", message: json?.error ?? "Something went wrong. Please try again." });
  }

  return (
    <section className="mb-6 rounded-xl border border-line bg-card p-4">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          Track any product: paste a product page link
          <input
            type="url"
            required
            placeholder="https://www.example-shop.com/product/123"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-10 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={state.kind === "saving"}
          className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {state.kind === "saving" ? "Reading price…" : "Track price"}
        </button>
      </form>
      {state.kind === "error" && (
        <p role="alert" className="mt-3 text-sm text-bad">
          {state.message}
        </p>
      )}
      {state.kind === "demo" && (
        <p className="mt-3 text-sm text-ink">
          Found <strong>{state.product.title}</strong> at <strong>{money(state.product.price, state.product.currency)}</strong>. (Demo
          mode: not saved.)
        </p>
      )}
      <p className="mt-2 text-xs text-faint">Works with shops that publish product data for Google Shopping. Checked again every day.</p>
    </section>
  );
}
