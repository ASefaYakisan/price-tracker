import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { getDictionary, resolveLang } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/reset-password">): Promise<Metadata> {
  const t = await getDictionary(await resolveLang(params));
  return { title: `${t.meta.newPassword} · ${t.meta.title}` };
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-md items-center px-4 py-10">
      <div className="w-full">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
