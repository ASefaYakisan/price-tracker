"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { money } from "@/lib/format";
import { useUser } from "@/lib/auth";
import { refreshMyProducts } from "@/lib/my-products";
import { authEnabled } from "@/lib/supabase/client";

const PENDING_KEY = "pending-link";
// The phone's Share menu lands on /add, which sends the link here as /<lang>#track=<link>.
const SHARED_HASH = "#track=";

type Preview = { title: string; price: number; currency: string | null };
type State = { kind: "idle" | "saving" } | { kind: "demo"; product: Preview } | { kind: "error"; message: string };

export function TrackForm() {
  const router = useRouter();
  const { t, lang, href, fill, apiError } = useI18n();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [shared, setShared] = useState<string | null>(null);
  const user = useUser();
  const signedOut = authEnabled && user === null;

  // A link pasted before signing in waits here and is back in the box after sign-in.
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(PENDING_KEY);
      if (!pending) return;
      sessionStorage.removeItem(PENDING_KEY);
      setUrl(pending); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only storage, read once after mount
    } catch {}
  }, []);

  // A link shared from a shop app (via /add) fills the box.
  useEffect(() => {
    if (!location.hash.startsWith(SHARED_HASH)) return;
    let link = location.hash.slice(SHARED_HASH.length);
    try {
      link = decodeURIComponent(link);
    } catch {}
    history.replaceState(null, "", location.pathname + location.search);
    setUrl(link); // eslint-disable-line react-hooks/set-state-in-effect -- the address bar is browser-only, read once after mount
    setShared(link);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(url);
  }

  async function send(link: string) {
    if (signedOut) {
      try {
        sessionStorage.setItem(PENDING_KEY, link);
      } catch {}
      router.push(href("/login"));
      return;
    }
    setState({ kind: "saving" });
    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: link }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.id) {
      // Reset first: the browser can restore this page from history with its old state.
      setState({ kind: "idle" });
      setUrl("");
      refreshMyProducts();
      router.push(href(`/products/${json.id}`));
      router.refresh();
    } else if (res?.ok && json?.demo) setState({ kind: "demo", product: json.product });
    else setState({ kind: "error", message: apiError(json?.error) });
  }

  // A shared link is sent once we know whether the visitor is signed in.
  useEffect(() => {
    if (!shared || user === undefined) return;
    setShared(null); // eslint-disable-line react-hooks/set-state-in-effect -- runs once per shared link
    send(shared);
  }, [shared, user]); // eslint-disable-line react-hooks/exhaustive-deps -- send only reads the latest state

  return (
    <div>
      <form onSubmit={submit}>
        <label htmlFor="track-url" className="sr-only">
          {t.track.label}
        </label>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-line bg-card p-1.5 ps-3 focus-within:border-accent sm:flex-nowrap">
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
          {/* text, not url: a shop app's share text ("Bu ürüne bak! https://ty.gl/...") is accepted as is */}
          <input
            id="track-url"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            dir="ltr"
            placeholder={t.track.placeholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-11 min-w-0 flex-1 basis-40 bg-transparent text-base text-ink placeholder:text-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={state.kind === "saving"}
            className="h-11 w-full shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-6"
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
      <p className="mt-2 text-xs text-faint">
        {signedOut ? t.track.signIn : t.track.hint}{" "}
        <Link href={href("/how-to-add")} className="font-medium text-accent underline-offset-4 hover:underline">
          {t.howTo.link}
        </Link>
      </p>
    </div>
  );
}
