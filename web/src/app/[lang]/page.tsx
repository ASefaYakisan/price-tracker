import { getProducts, getSparklines, isDemo } from "@/lib/data";
import { HomeLists } from "@/components/HomeLists";
import { TrackForm } from "@/components/TrackForm";
import { getDictionary, resolveLang } from "@/i18n/server";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const lang = await resolveLang(params);
  const [t, products] = await Promise.all([getDictionary(lang), getProducts()]);
  const sparklines = await getSparklines(products.map((p) => p.id));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12">
      <section className="max-w-3xl py-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">{t.home.heroTitle}</h1>
        <p className="mt-2 mb-5 max-w-2xl text-base text-pretty text-muted sm:mt-3 sm:mb-6 sm:text-lg">{t.home.heroLead}</p>
        <TrackForm />
        <ol className="mt-5 hidden flex-wrap gap-x-6 gap-y-2 text-sm text-ink sm:flex">
          {[t.home.step1, t.home.step2, t.home.step3].map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent tabular-nums" aria-hidden>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {isDemo && (
        <p className="mb-6 border-s-2 border-warn ps-3 text-sm text-muted">{t.home.demo}</p>
      )}

      <h2 className="sr-only">{t.home.title}</h2>
      <HomeLists products={products} sparklines={sparklines} />
    </main>
  );
}
