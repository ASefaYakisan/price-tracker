"use client";

import { useRef, useState } from "react";
import type { PricePoint } from "@/lib/data";
import { axisMoney, money, shortDate } from "@/lib/format";

const W = 720;
const H = 260;
const PAD = { top: 16, right: 12, bottom: 28, left: 76 };

// Round axis ticks to 1, 2 or 5 × 10^n so labels read £45, £50, £55.
function niceTicks(min: number, max: number, count = 4) {
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
  const [hover, setHover] = useState<number | null>(null);
  const data = points.filter((p): p is PricePoint & { price: number } => p.price != null);
  if (data.length < 2) {
    return <p className="py-10 text-center text-sm text-muted">Not enough history yet. The chart appears after two scrapes.</p>;
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
  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Price history from ${shortDate(t0)} to ${shortDate(t1)}, between ${money(Math.min(...prices), currency)} and ${money(Math.max(...prices), currency)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <text x={PAD.left - 10} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="var(--faint)">
              {axisMoney(v, currency)}
            </text>
          </g>
        ))}
        {[t0, midT, t1].map((t, i) => (
          <text key={i} x={x(t)} y={H - 6} textAnchor={(["start", "middle", "end"] as const)[i]} fontSize="12" fill="var(--faint)">
            {shortDate(t)}
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
          <div className="text-muted">{shortDate(h.t)}</div>
          <div className="text-sm font-semibold tabular-nums text-ink">{money(h.v, currency)}</div>
          {!h.stock && <div className="text-warn">Out of stock</div>}
        </div>
      )}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Show data as table</summary>
        <table className="mt-2 w-full">
          <thead className="text-left text-xs text-faint">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 text-right font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={p.scraped_at} className="border-t border-line">
                <td className="py-1.5 text-muted">{shortDate(times[i])}</td>
                <td className="py-1.5 text-right tabular-nums">{money(p.price, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
