const TONES = {
  accent: "bg-accent-soft text-accent",
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  teal: "bg-teal-soft text-teal",
} as const;

export function Stat({
  label,
  value,
  hint,
  tone,
  icon,
  iconTone = "accent",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "good" | "bad" | "warn";
  icon?: React.ReactNode;
  iconTone?: keyof typeof TONES;
}) {
  const color = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-soft sm:flex-row">
      {icon && (
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONES[iconTone]}`} aria-hidden>
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {icon}
          </svg>
        </span>
      )}
      <div className="min-w-0">
        <div className="text-sm text-muted">{label}</div>
        <div className={`mt-0.5 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
        {hint && <div className="mt-0.5 text-xs text-faint">{hint}</div>}
      </div>
    </div>
  );
}
