import { changeTone, percentChange } from "@/lib/format";

const W = 88;
const H = 28;
const TONES = { good: ["stroke-good", "fill-good"], bad: ["stroke-bad", "fill-bad"], flat: ["stroke-faint", "fill-faint"] };

// 30-day trend next to the price; colored from the viewer's side, like the change badge.
export function Sparkline({ points, source, label, className = "" }: { points?: number[]; source: string; label: string; className?: string }) {
  if (!points || points.length < 2) return <span className={`inline-block w-[88px] ${className}`} aria-hidden />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * (W - 2) + 1;
  const y = (v: number) => (max === min ? H / 2 : 2 + (1 - (v - min) / span) * (H - 4));
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const pct = percentChange(points.at(-1)!, points[0]);
  const tone = pct == null || Math.abs(pct) < 0.005 ? "flat" : changeTone(pct, source);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={`shrink-0 overflow-visible ${className}`} role="img" aria-label={label}>
      <title>{label}</title>
      <path d={d} fill="none" className={TONES[tone][0]} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(points.at(-1)!)} r="2.2" className={TONES[tone][1]} />
    </svg>
  );
}
