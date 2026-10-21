import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { getDictionary, resolveLang } from "@/i18n/server";

const ICONS = [
  <path key="history" d="M3 17l5-5 4 4 8-9M15 7h5v5" />,
  <path key="alert" d="M6 16V11a6 6 0 1112 0v5l2 2H4l2-2zM10 21h4" />,
  <path key="telegram" d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15zM9 13l8-6" />,
  <path key="devices" d="M4 6h16v10H4zM2 20h20M9 16v4M15 16v4" />,
];

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  const t = await getDictionary(await resolveLang(params));
  return { title: `${t.meta.signIn} · ${t.meta.title}` };
}

export default async function LoginPage({ params }: PageProps<"/[lang]/login">) {
  const t = await getDictionary(await resolveLang(params));
  const features = [
    [t.auth.f1Title, t.auth.f1Text],
    [t.auth.f2Title, t.auth.f2Text],
    [t.auth.f3Title, t.auth.f3Text],
    [t.auth.f4Title, t.auth.f4Text],
  ];
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-4xl items-center px-4 py-8">
      <div className="grid w-full overflow-hidden rounded-xl border border-line bg-card md:grid-cols-[1fr_1.1fr]">
        <section className="order-2 border-t border-line bg-bg p-6 sm:p-10 md:order-1 md:border-t-0 md:border-e">
          <p className="text-sm font-medium text-accent">{t.meta.title}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{t.auth.tagline}</h1>
          <p className="mt-2 text-sm text-muted">{t.auth.intro}</p>
          <ul className="mt-8 flex flex-col gap-5 border-t border-line pt-6">
            {features.map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {ICONS[i]}
                  </svg>
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-sm text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="order-1 md:order-2 md:self-center">
          <Suspense fallback={<div className="h-[28rem] animate-pulse" />}>
            <AuthForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
