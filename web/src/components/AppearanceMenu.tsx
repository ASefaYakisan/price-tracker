"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/client";
import { MODES, type Mode, type Palette, PALETTES, SWATCHES } from "@/lib/appearance";

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

function read(): string {
  try {
    return `${localStorage.getItem("mode") ?? "system"}|${localStorage.getItem("palette") ?? "indigo"}`;
  } catch {
    return "system|indigo";
  }
}

function apply(mode: Mode, palette: Palette) {
  const root = document.documentElement;
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
  if (palette === "indigo") delete root.dataset.palette;
  else root.dataset.palette = palette;
  try {
    localStorage.setItem("mode", mode);
    localStorage.setItem("palette", palette);
  } catch {}
  listeners.forEach((l) => l());
}

const ICONS: Record<Mode, React.ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />,
  system: <path d="M4 5h16v11H4zM8 20h8M12 16v4" />,
};

export function AppearanceMenu() {
  const { t } = useI18n();
  const [mode, palette] = useSyncExternalStore(subscribe, read, () => "system|indigo").split("|") as [Mode, Palette];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.appearance.title}
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-lg border border-line bg-card text-muted hover:bg-hover hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          {ICONS[mode]}
        </svg>
      </button>
      {open && (
        <div className="fixed inset-x-4 top-16 z-30 rounded-xl border border-line bg-card p-3 text-sm shadow-lg sm:absolute sm:inset-x-auto sm:end-0 sm:top-auto sm:mt-2 sm:w-64">
          <div className="mb-2 text-xs font-medium text-muted">{t.appearance.mode}</div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg p-1">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => apply(m, palette)}
                aria-pressed={mode === m}
                className={`flex flex-col items-center gap-1 rounded-md py-2 text-xs ${mode === m ? "bg-card font-medium text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden
                >
                  {ICONS[m]}
                </svg>
                {t.appearance[m]}
              </button>
            ))}
          </div>
          <div className="mt-4 mb-2 text-xs font-medium text-muted">{t.appearance.colors}</div>
          <div className="flex justify-between">
            {PALETTES.map((p) => (
              <button
                key={p}
                onClick={() => apply(mode, p)}
                aria-pressed={palette === p}
                title={t.appearance[p]}
                aria-label={t.appearance[p]}
                className={`grid size-10 place-items-center rounded-full border-2 ${palette === p ? "border-ink" : "border-transparent hover:border-line"}`}
              >
                <span
                  className="size-7 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${SWATCHES[p][0]} 50%, ${SWATCHES[p][1]} 50%)` }}
                />
              </button>
            ))}
          </div>
          <div className="mt-2 text-center text-xs text-faint">{t.appearance[palette]}</div>
        </div>
      )}
    </div>
  );
}
