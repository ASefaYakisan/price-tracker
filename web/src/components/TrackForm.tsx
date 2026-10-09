"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { money } from "@/lib/format";
import { useUser } from "@/lib/auth";
import { authEnabled } from "@/lib/supabase/client";

type Preview = { title: string; price: number; currency: string | null };
type State = { kind: "idle" | "saving" } | { kind: "demo"; product: Preview } | { kind: "error"; message: string };

export function TrackForm() {
  const router = useRouter();
  const { t, lang, href, fill, apiError } = useI18n();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const user = useUser();

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
      router.push(href(`/products/${json.id}`));
      router.refresh();
    } else if (res?.ok && json?.demo) setState({ kind: "demo", product: json.product });
    else setState({ kind: "error", message: apiError(json?.error) });
  }

  if (authEnabled && !user) {
    return (
      <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:p-5">
        <div className="flex-1">
          <div className="text-sm font-medium">{t.track.label}</div>
          <p className="mt-0.5 text-sm text-muted">{t.track.signIn}</p>
        </div>
        {user === null && (
          <a
            href={href("/login")}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-accent-ink hover:opacity-90"
          >
            {t.alertForm.signInButton}
          </a>
        )}
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-line bg-card p-4 shadow-soft sm:p-5">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-ink">
          {t.track.label}
          <span className="relative">
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute start-3 top-3 size-4 text-faint"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M8.5 11.5a3.5 3.5 0 005 0l3-3a3.5 3.5 0 00-5-5l-1 1M11.5 8.5a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 005 5l1-1" />
            </svg>
            <input
              type="url"
              required
              dir="ltr"
              placeholder={t.track.placeholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-bg ps-9 pe-3 text-sm font-normal text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </span>
        </label>
        <button
          type="submit"
          disabled={state.kind === "saving"}
          className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {state.kind === "saving" ? t.track.reading : t.track.submit}
        </button>
      </form>
      {state.kind === "error" && (
        <p role="alert" className="mt-3 text-sm text-bad">
          {state.message}
        </p>
      )}
      {state.kind === "demo" && (
        <p className="mt-3 text-sm text-ink">
          {fill(t.track.found, { title: state.product.title, price: money(state.product.price, state.product.currency, lang) })}
        </p>
      )}
      <p className="mt-2 text-xs text-faint">{t.track.hint}</p>
    </section>
  );
}
