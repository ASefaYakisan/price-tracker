"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { useI18n } from "@/i18n/client";
import { generate, RULES, type Rule, score } from "@/lib/password";

const LEVELS = ["", "weak", "fair", "good", "strong"] as const;
const BAR = ["", "bg-bad", "bg-warn", "bg-teal", "bg-good"];

// New password with a strength meter, the rule checklist and a "suggest a strong password" button.
export function NewPasswordField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  const { t } = useI18n();
  const [suggested, setSuggested] = useState(false);
  const [copied, setCopied] = useState(false);
  const level = score(value);

  function suggest() {
    onChange(generate());
    setSuggested(true);
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm text-muted">
      <span className="flex items-center justify-between gap-2">
        <label htmlFor="new-password">{label}</label>
        <button type="button" onClick={suggest} className="text-xs font-medium text-accent hover:underline">
          {t.auth.suggest}
        </button>
      </span>
      <PasswordInput
        id="new-password"
        required
        autoComplete="new-password"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSuggested(false);
        }}
        className={className}
        forceShown={suggested}
      />
      {suggested && (
        <p className="flex items-start justify-between gap-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-ink">
          <span>{t.auth.suggested}</span>
          <button type="button" onClick={copy} className="shrink-0 font-medium text-accent hover:underline">
            {copied ? t.auth.copied : t.auth.copy}
          </button>
        </p>
      )}
      <div className="mt-1 flex items-center gap-2" aria-live="polite">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1.5 rounded-full ${i <= level ? BAR[level] : "bg-hover"}`} />
          ))}
        </div>
        <span className="w-16 text-end text-xs">{level ? t.auth[LEVELS[level]] : ""}</span>
      </div>
      <div className="mt-1 text-xs text-faint">{t.auth.rules}</div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {(Object.keys(RULES) as Rule[]).map((rule) => {
          const ok = RULES[rule](value);
          return (
            <li key={rule} className={`flex items-center gap-1.5 ${ok ? "text-good" : "text-faint"}`}>
              <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                {ok ? <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" /> : <circle cx="8" cy="8" r="2.5" />}
              </svg>
              {t.auth[rule]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
