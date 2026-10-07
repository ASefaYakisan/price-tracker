"use client";

import { useRef, useState } from "react";
import type { PricePoint } from "@/lib/data";

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

export function PriceChart({ points, currency }: { points: PricePoint[]; currency: string | null }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const data = points.filter((p): p is PricePoint & { price: number } => p.price != null);
  if (data.length < 2) return <p className="text-sm text-zinc-500">Not enough history yet. Prices appear after two scrapes.</p>;

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: currency ?? "USD" }).format(v);
  const times = data.map((p) => Date.parse(p.scraped_at));
  const prices = data.map((p) => p.price);
  const [t0, t1] = [times[0], times[times.length - 1]];
  const pad = (Math.max(...prices) - Math.min(...prices)) * 0.15 || 1;
  const [lo, hi] = [Math.min(...prices) - pad, Math.max(...prices) + pad];
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const path = data.map((p, i) => `${i ? "L" : "M"}${x(times[i]).toFixed(1)},${y(p.price).toFixed(1)}`).join("");
  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);
  const dateLabel = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    times.forEach((t, i) => {
      if (Math.abs(x(t) - px) < Math.abs(x(times[best]) - px)) best = i;
    });
    setHover(best);
  }

  const h = hover == null ? null : { t: times[hover], v: data[hover].price };
  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Price history from ${dateLabel(t0)} to ${dateLabel(t1)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e4e4e7" />
            <text x={PAD.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#71717a">
              {fmt(v)}
            </text>
          </g>
        ))}
        {[t0, t1].map((t, i) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor={i ? "end" : "start"} fontSize="11" fill="#71717a">
            {dateLabel(t)}
          </text>
        ))}
        <path d={path} fill="none" stroke="#2a78d6" strokeWidth="2" strokeLinejoin="round" />
        {h && (
          <>
            <line x1={x(h.t)} x2={x(h.t)} y1={PAD.top} y2={H - PAD.bottom} stroke="#a1a1aa" strokeWidth="1" />
            <circle cx={x(h.t)} cy={y(h.v)} r="4" fill="#2a78d6" stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-0 rounded border border-zinc-200 bg-white px-2 py-1 text-xs shadow-sm"
          style={{ left: `${(x(h.t) / W) * 100}%`, transform: x(h.t) > W / 2 ? "translateX(-110%)" : "translateX(10%)" }}
        >
          <div className="text-zinc-500">{dateLabel(h.t)}</div>
          <div className="font-medium tabular-nums">{fmt(h.v)}</div>
        </div>
      )}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-zinc-500">Show as table</summary>
        <table className="mt-2 w-full">
          <tbody>
            {data.map((p, i) => (
              <tr key={p.scraped_at} className="border-t border-zinc-100">
                <td className="py-1">{dateLabel(times[i])}</td>
                <td className="py-1 text-right tabular-nums">{fmt(p.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
