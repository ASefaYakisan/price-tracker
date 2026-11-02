"use client";

import { useEffect, useRef, useState } from "react";
import type { PricePoint } from "@/lib/data";
import { useI18n } from "@/i18n/client";
import { intlLocale } from "@/i18n/config";
import { axisMoney, money, shortDate } from "@/lib/format";
import { HISTORY_GOAL_DAYS, historyDay } from "@/lib/history-progress";

function HistoryProgress({ firstReadingAt }: { firstReadingAt: string }) {
  const { t, fill } = useI18n();
  const day = historyDay(firstReadingAt);
  if (day == null) return null;
  const text = fill(t.product.historyProgress, { day: String(day), goal: String(HISTORY_GOAL_DAYS) });
  return (
    <div className="mt-3" role="progressbar" aria-label={text} aria-valuemin={1} aria-valuemax={HISTORY_GOAL_DAYS} aria-valuenow={day}>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(day / HISTORY_GOAL_DAYS) * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">{text}</p>
    </div>
  );
}

const H = 260;

// Round axis ticks to 1, 2 or 5 × 10^n so labels read £45, £50, £55.
function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    // A flat line still needs a range, otherwise every point sits on the top edge.
    const pad = Math.abs(min) * 0.05 || 1;
    [min, max] = [min - pad, max + pad];
  }
  const raw = (max - min) / count || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { lo, hi, ticks };
}

export function PriceChart({ points, currency }: { points: PricePoint[]; currency: string | null }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const labelsRef = useRef<SVGGElement>(null);
  const [size, setSize] = useState({ width: 720, left: 76 });
  const [hover, setHover] = useState<number | null>(null);
  const { t, lang, fill } = useI18n();
  const data = points.filter((p): p is PricePoint & { price: number } => p.price != null);
  const hasChart = data.length >= 2;
  useEffect(() => {
    const svg = svgRef.current;
    const labels = labelsRef.current;
    if (!svg || !labels) return;
    const observer = new ResizeObserver(() => {
      const width = svg.getBoundingClientRect().width;
      if (!width) return;
      // Keep the desktop drawing unchanged; below this width its 12px text would shrink under 11px.
      const left = width < 660 ? Math.max(52, Math.ceil(labels.getBBox().width) + 12) : 76;
      setSize((previous) => previous.width === width && previous.left === left ? previous : { width, left });
    });
    observer.observe(svg);
    observer.observe(labels);
    return () => observer.disconnect();
  }, [hasChart]);
  const narrow = size.width < 660;
  const W = narrow ? size.width : 720;
  const PAD = { top: 16, right: 12, bottom: 28, left: size.left };
  const compactMoney = new Intl.NumberFormat(intlLocale(lang), {
    style: "currency",
    currency: currency ?? "USD",
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  if (data.length === 1) {
    // One real reading: show it instead of an empty chart, and say plainly when the history starts.
    return (
      <div className="rounded-xl border border-line px-4 py-8 text-center">
        <p className="text-2xl font-bold tabular-nums">{money(data[0].price, currency, lang)}</p>
        <p className="mt-2 text-sm text-muted">{fill(t.product.trackingStarted, { date: shortDate(Date.parse(data[0].scraped_at), lang) })}</p>
        <div className="mx-auto max-w-xs">
          <HistoryProgress firstReadingAt={data[0].scraped_at} />
        </div>
      </div>
    );
  }
  if (data.length < 2) {
    return <p className="py-10 text-center text-sm text-muted">{t.product.notEnough}</p>;
  }

  const times = data.map((p) => Date.parse(p.scraped_at));
  const prices = data.map((p) => p.price);
  const [t0, t1] = [times[0], times[times.length - 1]];
  const { lo, hi, ticks } = niceTicks(Math.min(...prices), Math.max(...prices));
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const line = data.map((p, i) => `${i ? "L" : "M"}${x(times[i]).toFixed(1)},${y(p.price).toFixed(1)}`).join("");
  const area = `${line}L${x(t1).toFixed(1)},${y(lo)}L${x(t0).toFixed(1)},${y(lo)}Z`;
  const midT = times[Math.floor(times.length / 2)];
  // Within a day the date is the same at every tick, so show the time instead; drop repeated labels.
  const sameDay = t1 - t0 < 36 * 3_600_000;
  const xLabel = (t: number) =>
    sameDay ? new Date(t).toLocaleTimeString(intlLocale(lang), { hour: "2-digit", minute: "2-digit" }) : shortDate(t, lang);
  // Ends first, so a middle tick that repeats an end label is the one dropped.
  const xTicks = [
    { t: t0, i: 0 },
    { t: t1, i: 2 },
    { t: midT, i: 1 },
  ]
    .map((tick) => ({ ...tick, label: xLabel(tick.t) }))
    .filter((tick, k, all) => all.findIndex((o) => o.label === tick.label) === k);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    times.forEach((t, i) => {
      if (Math.abs(x(t) - px) < Math.abs(x(times[best]) - px)) best = i;
    });
    setHover(best);
  }

  const h = hover == null ? null : { t: times[hover], v: data[hover].price, stock: data[hover].in_stock };
  // Charts read left to right in every language.
  return (
    <div className="relative" dir="ltr">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={fill(t.product.chartLabel, {
          from: shortDate(t0, lang),
          to: shortDate(t1, lang),
          min: money(Math.min(...prices), currency, lang),
          max: money(Math.max(...prices), currency, lang),
        })}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g ref={labelsRef}>
          {ticks.map((v) => (
            <text key={v} x={PAD.left - 10} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="var(--faint)">
              {narrow && Math.abs(v) >= 1 ? compactMoney.format(v) : axisMoney(v, currency, lang)}
            </text>
          ))}
        </g>
        {ticks.map((v) => (
          <line key={v} x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
        ))}
        {xTicks.map(({ t, i, label }) => (
          <text key={i} x={x(t)} y={H - 6} textAnchor={(["start", "middle", "end"] as const)[i]} fontSize="12" fill="var(--faint)">
            {label}
          </text>
        ))}
        <path d={area} fill="url(#area)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {h && (
          <>
            <line x1={x(h.t)} x2={x(h.t)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--faint)" strokeDasharray="3 3" />
            <circle cx={x(h.t)} cy={y(h.v)} r="5" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />
          </>
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-1 rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg"
          style={{ left: `${(x(h.t) / W) * 100}%`, transform: x(h.t) > W / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
        >
          <div className="text-muted">{shortDate(h.t, lang)}</div>
          <div className="text-sm font-semibold tabular-nums text-ink">{money(h.v, currency, lang)}</div>
          {!h.stock && <div className="text-warn">{t.change.outOfStock}</div>}
        </div>
      )}
      <details className="mt-4 max-sm:overflow-x-auto text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">{t.product.showTable}</summary>
        <table className="mt-2 w-full">
          <thead className="text-start text-xs text-faint">
            <tr>
              <th className="py-1 font-medium">{t.product.date}</th>
              <th className="py-1 text-end font-medium">{t.product.price}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={p.scraped_at} className="border-t border-line">
                <td className="py-1.5 text-muted">{shortDate(times[i], lang)}</td>
                <td className="py-1.5 text-end tabular-nums">{money(p.price, currency, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <HistoryProgress firstReadingAt={data[0].scraped_at} />
    </div>
  );
}
