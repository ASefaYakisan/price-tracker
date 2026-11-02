import type { Metadata } from "next";
import Link from "next/link";
import { ProfileView } from "@/components/ProfileView";
import { getDictionary, resolveLang } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/profile">): Promise<Metadata> {
  const t = await getDictionary(await resolveLang(params));
  return { title: `${t.nav.profile} · ${t.meta.title}`, robots: { index: false } };
}

export default async function ProfilePage({ params }: PageProps<"/[lang]/profile">) {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href={`/${lang}`} className="text-sm text-muted hover:text-ink">
        <span aria-hidden className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {t.common.allItems}
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">{t.nav.profile}</h1>
      <ProfileView />
    </main>
  );
}
