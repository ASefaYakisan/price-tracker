import type { Metadata } from "next";
import { Suspense } from "react";
import { RemoveAlertForm } from "@/components/RemoveAlertForm";
import { getDictionary, resolveLang } from "@/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function RemoveAlertPage({ params }: PageProps<"/[lang]/alerts/remove">) {
  const t = await getDictionary(await resolveLang(params));
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">{t.removeAlert.title}</h1>
      <Suspense fallback={<p>{t.common.pleaseWait}</p>}>
        <RemoveAlertForm />
      </Suspense>
    </main>
  );
}
