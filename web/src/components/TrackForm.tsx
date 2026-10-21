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
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-3 ps-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted">{t.track.signIn}</p>
        {user === null && (
          <a
            href={href("/login")}
            className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-ink hover:opacity-90"
          >
            {t.alertForm.signInButton}
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={submit}>
        <label htmlFor="track-url" className="sr-only">
          {t.track.label}
        </label>
        <div className="flex items-center gap-2 rounded-xl border-2 border-line bg-card p-1.5 ps-3 focus-within:border-accent">
          <svg
            viewBox="0 0 20 20"
            className="size-5 shrink-0 text-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M8.5 11.5a3.5 3.5 0 005 0l3-3a3.5 3.5 0 00-5-5l-1 1M11.5 8.5a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 005 5l1-1" />
          </svg>
          <input
            id="track-url"
            type="url"
            required
            dir="ltr"
            placeholder={t.track.placeholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={state.kind === "saving"}
            className="h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60 sm:px-6"
          >
            {state.kind === "saving" ? t.track.reading : t.track.submit}
          </button>
        </div>
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
    </div>
  );
}
