import type { Metadata } from "next";
import { LOCALE_CODES } from "@/i18n/config";
import { getProducts, getSparklines, isDemo } from "@/lib/data";
import { HomeLists } from "@/components/HomeLists";
import { TrackForm } from "@/components/TrackForm";
import { getDictionary, resolveLang } from "@/i18n/server";
import Link from "next/link";
import { SUPPORTED_STORES } from "@/lib/supported-stores";
import { homeJsonLd } from "@/lib/home-seo";
import { siteUrl } from "@/lib/site-url";

// Home alternates must not be inherited by product and account pages.
export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  return {
    // Keyword-bearing title and a user-facing description (the layout default is generic).
    title: { absolute: `${t.meta.title} – ${t.home.heroTitle}` },
    description: t.home.heroLead,
    openGraph: { title: `${t.meta.title} – ${t.home.heroTitle}`, description: t.home.heroLead, url: `/${lang}` },
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(LOCALE_CODES.map((l) => [l, `/${l}`])),
    },
  };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const lang = await resolveLang(params);
  const [t, products] = await Promise.all([getDictionary(lang), getProducts()]);
  const sparklines = await getSparklines(products.map((p) => p.id));

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeJsonLd({ name: t.meta.title, description: t.home.heroLead, lang, origin: siteUrl() }) }} />
      <section className="max-w-3xl py-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">{t.home.heroTitle}</h1>
        <p className="mt-2 mb-5 max-w-2xl text-base text-pretty text-muted sm:mt-3 sm:mb-6 sm:text-lg">{t.home.heroLead}</p>
        <TrackForm />
        <ol className="mt-5 flex flex-col gap-2 text-sm text-ink sm:flex-row sm:flex-wrap sm:gap-x-6">
          {[t.home.step1, t.home.step2, t.home.step3].map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent tabular-nums" aria-hidden>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
          <Link href={`/${lang}/how-to-add#stores`} className="inline-flex min-h-11 items-center font-medium text-muted underline sm:min-h-0">
            {t.howTo.storesTitle}
          </Link>
          {SUPPORTED_STORES.filter((st) => st.status === "works").slice(0, 8).map((st) => (
            <span key={st.domain} className="rounded-full border border-line bg-card px-2.5 py-1 text-ink">{st.name}</span>
          ))}
        </div>
      </section>

      {isDemo && (
        <p className="mb-6 border-s-2 border-warn ps-3 text-sm text-muted">{t.home.demo}</p>
      )}

      <h2 className="sr-only">{t.home.title}</h2>
      <HomeLists products={products} sparklines={sparklines} />
    </main>
  );
}
