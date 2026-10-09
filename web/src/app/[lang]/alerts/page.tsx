import type { Metadata } from "next";
import Link from "next/link";
import { AlertsOverview } from "@/components/AlertsOverview";
import { getDictionary, resolveLang } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/alerts">): Promise<Metadata> {
  const t = await getDictionary(await resolveLang(params));
  return { title: `${t.meta.alerts} · ${t.meta.title}` };
}

export default async function AlertsPage({ params }: PageProps<"/[lang]/alerts">) {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href={`/${lang}`} className="text-sm text-muted hover:text-ink">
        <span aria-hidden className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {t.common.allItems}
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">{t.alerts.title}</h1>
      <AlertsOverview />
    </main>
  );
}
