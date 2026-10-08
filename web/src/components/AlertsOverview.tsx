"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AlertStatus } from "@/lib/alert-status";
import { BellIcon } from "@/components/BellIcon";
import { money, shortDate, sourceLabel } from "@/lib/format";
import { refreshAccountAlerts, useAccountAlerts, useVisibleAlerts } from "@/lib/account-alerts";
import { removeAlert, replaceAlert, type SavedAlert, useMyAlerts } from "@/lib/my-alerts";

type Live = Exclude<AlertStatus, { missing: true }>;

export function AlertsOverview() {
  const { user, rows: accountRows } = useAccountAlerts();
  const signedIn = Boolean(user);
  const local = useMyAlerts();
  const saved = useVisibleAlerts();
  const [localLive, setLive] = useState<(AlertStatus | null)[] | null>(null);
  const live = signedIn ? accountRows : localLive;
  const signature = JSON.stringify(local.map((a) => [a.id, a.token, a.productId, a.email, a.target]));

  // Guests: ask the server for each saved alert's live state; it is the source of truth for target, email and sent date.
  // Signed-in users get the same data straight from their account.
  useEffect(() => {
    if (user !== null || !local.length) return;
    const saved = local;
    let cancelled = false;
    fetch("/api/alerts/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alerts: saved }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json?.ok) return;
        const rows: AlertStatus[] = json.alerts;
        setLive(rows);
        rows.forEach((row, i) => {
          const local = saved[i];
          if ("missing" in row || !local) return;
          if (local.id !== row.id || local.token !== row.token || local.email !== row.email || local.target !== row.target)
            replaceAlert(local, { ...local, id: row.id, token: row.token, email: row.email, target: row.target });
        });
      })
      .catch(() => !cancelled && setLive(saved.map(() => null)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the saved alerts actually change
  }, [signature, user]);

  if (user === undefined || (signedIn && !accountRows)) {
    return (
      <div className="space-y-3" aria-busy>
        {[0, 1].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-line bg-card" />
        ))}
      </div>
    );
  }

  if (!saved.length) {
    return (
      <section className="flex flex-col items-center rounded-xl border border-line bg-card px-6 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
          <BellIcon className="size-6" />
        </span>
        <h2 className="mt-4 font-medium">No alerts yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Press the bell next to any item and we will email you when its price reaches your target.
        </p>
        <Link href="/" className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90">
          Browse items
        </Link>
      </section>
    );
  }

  const rows = saved.map((a, i) => ({ saved: a, live: live?.[i] }));
  const sent = rows.filter((r) => r.live && !("missing" in r.live) && r.live.sentAt).length;
  const reached = rows.filter((r) => r.live && !("missing" in r.live) && !r.live.sentAt && isReached(r.live)).length;
  return (
    <>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Summary label="Alerts" value={saved.length} />
        <Summary label="Target reached" value={live ? reached : "–"} tone="good" />
        <Summary label="Emails sent" value={live ? sent : "–"} />
      </div>
      <ul className="space-y-3">
        {rows.map(({ saved, live }) => (
          <AlertCard key={`${saved.id ?? ""}-${saved.productId}-${saved.email}`} saved={saved} live={live} account={signedIn} />
        ))}
      </ul>
      <p className="mt-4 text-xs text-faint">
        {signedIn ? (
          <>Saved to your account ({user?.email}), so you see them on every device.</>
        ) : (
          <>
            This list is kept in this browser.{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>{" "}
            to keep your alerts on every device.
          </>
        )}{" "}
        Each alert sends one email when the price is at or below the target; edit it to watch again.
      </p>
    </>
  );
}

function Summary({ label, value, tone }: { label: string; value: number | string; tone?: "good" }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "good" && value ? "text-good" : "text-ink"}`}>{value}</div>
    </div>
  );
}

const isReached = (l: Live) => l.price != null && l.price <= l.target;

function AlertCard({ saved, live, account }: { saved: SavedAlert; live: AlertStatus | null | undefined; account: boolean }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [email, setEmail] = useState(saved.email);
  const [target, setTarget] = useState(String(saved.target));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const missing = live != null && "missing" in live;
  const l = live && !("missing" in live) ? live : null;
  const currency = l?.currency ?? saved.currency;
  const canManage = Boolean(saved.id && saved.token);

  async function call(method: "PATCH" | "DELETE", body: object) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/alerts/${saved.id}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: saved.token, ...body }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok && json?.ok) return true;
    setErr(json?.error ?? "Something went wrong. Please try again.");
    return false;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next = Number(target);
    if (await call("PATCH", { email: email.trim(), targetPrice: next })) {
      if (account) await refreshAccountAlerts();
      else replaceAlert(saved, { ...saved, email: email.trim(), target: next });
      setMode("view");
    }
  }

  async function remove() {
    if (!(await call("DELETE", {}))) return;
    if (account) await refreshAccountAlerts();
    else removeAlert(saved);
  }

  const status = missing
    ? { label: "Not active", cls: "bg-hover text-muted" }
    : !l
      ? null
      : l.sentAt
        ? { label: `Email sent ${shortDate(l.sentAt)}`, cls: "bg-good-soft text-good" }
        : isReached(l)
          ? { label: "Target reached", cls: "bg-good-soft text-good" }
          : { label: "Watching", cls: "bg-accent-soft text-accent" };

  // How far the price still has to fall, as a bar that fills up as it gets closer.
  const progress = l?.price ? Math.min(1, l.target / l.price) : 0;
  const gap = l?.price != null ? l.price - l.target : null;

  const input = "h-10 rounded-lg border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none";
  return (
    <li className="rounded-xl border border-line bg-card p-4 sm:p-5">
      <div className="flex items-start gap-4">
        {l?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small remote thumbnails, no optimisation needed
          <img src={l.imageUrl} alt="" className="size-12 shrink-0 rounded-lg bg-white object-contain p-1" />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent-soft font-semibold text-accent" aria-hidden>
            {(l?.title ?? saved.title).replace(/^(the|a|an)\s+/i, "").slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/products/${saved.productId}`} className="block truncate font-medium text-ink hover:text-accent">
                {l?.title ?? saved.title}
              </Link>
              <div className="mt-0.5 text-xs text-faint">
                {l?.source ? `${sourceLabel(l.source)} · ` : ""}
                {saved.email} · set {shortDate(l?.createdAt ?? saved.createdAt)}
              </div>
            </div>
            {status ? (
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}>{status.label}</span>
            ) : (
              <span className="h-6 w-20 animate-pulse rounded-full bg-hover" />
            )}
          </div>

          {!missing && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted">Now</div>
                <div className="font-semibold tabular-nums">{l ? money(l.price, currency) : "…"}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Target</div>
                <div className="font-semibold tabular-nums">≤ {money(l?.target ?? saved.target, currency)}</div>
              </div>
              <div>
                <div className="text-xs text-muted">To go</div>
                <div className={`font-semibold tabular-nums ${gap != null && gap <= 0 ? "text-good" : ""}`}>
                  {gap == null ? "…" : gap <= 0 ? "Reached" : `${money(gap, currency)} (${((gap / l!.price!) * 100).toFixed(1)}%)`}
                </div>
              </div>
            </div>
          )}
          {l && !missing && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden>
              <div className={`h-full rounded-full ${progress >= 1 ? "bg-good" : "bg-accent"}`} style={{ width: `${progress * 100}%` }} />
            </div>
          )}
          {missing && (
            <p className="mt-3 text-sm text-muted">
              This alert was deleted or already used. Set a new one from the{" "}
              <Link href={`/products/${saved.productId}#alert`} className="text-accent hover:underline">
                item page
              </Link>
              .
            </p>
          )}

          {mode === "edit" && (
            <form onSubmit={save} className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
                Email
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted sm:w-40">
                Alert at or below{currency ? ` (${currency})` : ""}
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className={`${input} tabular-nums`}
                />
              </label>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("view");
                    setErr(null);
                  }}
                  className="h-10 rounded-lg border border-line px-4 text-sm text-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {mode === "delete" && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm">
              <span className="text-ink">Delete this alert? You will not get an email for it.</span>
              <button
                onClick={remove}
                disabled={busy}
                className="rounded-lg bg-bad px-3 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setMode("view")} className="rounded-lg border border-line px-3 py-1.5 text-muted hover:text-ink">
                Cancel
              </button>
            </div>
          )}

          {err && <p className="mt-3 text-sm text-bad">{err}</p>}

          {mode === "view" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {canManage && !missing && (
                <>
                  <button
                    onClick={() => {
                      setEmail(l?.email ?? saved.email);
                      setTarget(String(l?.target ?? saved.target));
                      setMode("edit");
                    }}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-hover"
                  >
                    {l?.sentAt ? "Watch again" : "Edit"}
                  </button>
                  <button
                    onClick={() => setMode("delete")}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm text-bad hover:bg-bad-soft"
                  >
                    Delete
                  </button>
                </>
              )}
              {(missing || (live !== undefined && !canManage)) && (
                <button
                  onClick={() => removeAlert(saved)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
                >
                  Remove from list
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
