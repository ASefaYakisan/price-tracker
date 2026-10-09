"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { className: string };

// Password field with a show / hide toggle on the right.
export function PasswordInput({ className, ...props }: Props) {
  const [shown, setShown] = useState(false);
  const { t } = useI18n();
  return (
    <span className="relative flex">
      <input {...props} type={shown ? "text" : "password"} className={`${className} w-full pe-11`} />
      <button
        type="button"
        onClick={() => setShown(!shown)}
        aria-label={shown ? t.auth.hidePassword : t.auth.showPassword}
        aria-pressed={shown}
        className="absolute inset-y-0 end-0 grid w-11 place-items-center text-faint hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M4 4l16 16" strokeLinecap="round" />}
        </svg>
      </button>
    </span>
  );
}
