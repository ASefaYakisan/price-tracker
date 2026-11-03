"use client";

import Link from "next/link";
import { DeleteAccount } from "@/components/DeleteAccount";
import { ExportData } from "@/components/ExportData";
import { ProfileSecurity } from "@/components/ProfileSecurity";
import { useUser } from "@/lib/auth";
import { authEnabled } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/client";

const date = (iso: string | undefined, lang: string) => (iso ? new Date(iso).toLocaleDateString(lang) : "");

export function ProfileView() {
  const user = useUser();
  const { t, href, lang } = useI18n();

  if (authEnabled && user === undefined) {
    return <div className="h-40 animate-pulse rounded-xl bg-hover" aria-busy />;
  }
  if (!authEnabled || !user) {
    return (
      <section className="flex flex-col items-center border-y border-line px-6 py-14 text-center">
        <Link
          href={href("/login?next=%2Fprofile")}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
        >
          {t.nav.signIn}
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="divide-y divide-line rounded-xl border border-line bg-card text-sm">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <span className="text-muted">{t.nav.profileEmail}</span>
          <span className="min-w-0 truncate font-medium text-ink">{user.email}</span>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <span className="text-muted">{t.nav.memberSince}</span>
          <span className="font-medium text-ink">{date(user.created_at, lang)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <span className="text-muted">{t.nav.lastSignIn}</span>
          <span className="font-medium text-ink">{date(user.last_sign_in_at, lang)}</span>
        </div>
        <Link href={href("/alerts")} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-hover">
          <span className="text-ink">{t.nav.myAlerts}</span>
          <span aria-hidden className="text-muted rtl:rotate-180">
            →
          </span>
        </Link>
      </section>
      <ProfileSecurity />
      <ExportData />
      <DeleteAccount />
    </div>
  );
}
