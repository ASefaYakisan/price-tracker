"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile, the bot check Supabase verifies on sign-in, sign-up and password reset.
// Without a site key the widget is skipped and the forms work as before.
export const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let script: Promise<TurnstileApi> | null = null;
function load() {
  script ??= new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    tag.async = true;
    tag.onload = () => (window.turnstile ? resolve(window.turnstile) : reject());
    tag.onerror = () => {
      script = null;
      reject();
    };
    document.head.appendChild(tag);
  });
  return script;
}

// Each token works once: change `round` after every request so the widget hands out a fresh one.
export function Turnstile({
  onToken,
  round,
  lang,
}: {
  onToken: (token: string | null) => void;
  round: number;
  lang: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);
  const report = useRef(onToken);
  useEffect(() => {
    report.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_KEY || !box.current) return;
    let gone = false;
    load()
      .then((api) => {
        if (gone || !box.current) return;
        const id = api.render(box.current, {
          sitekey: TURNSTILE_KEY,
          // Shows a checkbox only when Cloudflare is unsure; most visitors see nothing.
          appearance: "interaction-only",
          theme: "auto",
          language: lang,
          callback: (token: string) => report.current(token),
          "expired-callback": () => report.current(null),
          "error-callback": () => report.current(null),
        });
        widget.current = { api, id };
      })
      .catch(() => report.current(null));
    return () => {
      gone = true;
      if (widget.current) widget.current.api.remove(widget.current.id);
      widget.current = null;
    };
  }, [lang]);

  useEffect(() => {
    if (round === 0 || !widget.current) return;
    report.current(null);
    widget.current.api.reset(widget.current.id);
  }, [round]);

  if (!TURNSTILE_KEY) return null;
  return <div ref={box} className="flex justify-center empty:hidden" />;
}
