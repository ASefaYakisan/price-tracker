"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { money } from "@/lib/format";
import { refreshAccountAlerts } from "@/lib/account-alerts";
import { useUser } from "@/lib/auth";
import { authEnabled } from "@/lib/supabase/client";
import { BellIcon } from "@/components/BellIcon";
import { saveAlert } from "@/lib/my-alerts";
import { MyAlerts } from "@/components/MyAlerts";

type State = { kind: "idle" | "saving" } | { kind: "done"; demo: boolean; updated: boolean } | { kind: "error"; message: string };

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
  // null until the visitor types, so a signed-in user starts from their account's email.
  const [typedEmail, setEmail] = useState<string | null>(null);
  const [target, setTarget] = useState(suggested);
  const [state, setState] = useState<State>({ kind: "idle" });
  const user = useUser();
  const { t, lang, href, fill, apiError } = useI18n();
  const email = typedEmail ?? user?.email ?? "";

  // The page streams in, so the browser's own jump to #alert fires before this section exists.
  useEffect(() => {
    if (location.hash === "#alert") document.getElementById("alert")?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
      if (json.account) refreshAccountAlerts();
      else if (!json.demo)
        saveAlert({
          productId,
          title,
          email,
          target: Number(target),
          currency,
          createdAt: new Date().toISOString(),
          id: json.id,
          token: json.token,
        });
      setState({ kind: "done", demo: Boolean(json.demo), updated: Boolean(json.updated) });
    } else
      setState({
        kind: "error",
        message: apiError(json?.error),
      });
  }

  if (authEnabled && user === undefined) return <div className="h-24 animate-pulse rounded-xl bg-hover" />;
  if (authEnabled && !user) {
    const next = encodeURIComponent(`/products/${productId}#alert`);
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-line bg-bg p-5 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
          <BellIcon className="size-5" />
        </span>
        <div className="flex-1">
          <div className="font-medium">{t.alertForm.signInTitle}</div>
          <p className="mt-0.5 text-sm text-muted">{t.alertForm.signInText}</p>
        </div>
        <a
          href={href(`/login?next=${next}`)}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
        >
          {t.alertForm.signInButton}
        </a>
      </div>
    );
  }

  if (state.kind === "done") {
    return (
      <>
        <p className="rounded-lg bg-good-soft px-4 py-3 text-sm text-ink">
          {state.updated ? t.alertForm.updated : t.alertForm.done}{" "}
          {fill(t.alertForm.willEmail, { email, price: money(Number(target), currency, lang) })}
          {state.demo && ` ${t.alertForm.demo}`}{" "}
          <button type="button" onClick={() => setState({ kind: "idle" })} className="font-medium text-accent hover:underline">
            {t.alertForm.addAnother}
          </button>
        </p>
        <MyAlerts productId={productId} title={t.alertForm.yourAlertsHere} />
      </>
    );
  }

  const input =
    "h-10 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none";
  return (
    <>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          {t.common.email}
          <input
            type="email"
            required
            autoComplete="email"
            placeholder={t.common.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted sm:w-48">
          {t.alertForm.atOrBelow}
          {currency ? ` (${currency})` : ""}
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
          className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {state.kind === "saving" ? t.common.saving : t.alertForm.create}
        </button>
        {state.kind === "error" && (
          <p role="alert" className="text-sm text-bad sm:basis-full">
            {state.message}
          </p>
        )}
      </form>
      <MyAlerts productId={productId} title={t.alertForm.yourAlertsHere} />
    </>
  );
}
