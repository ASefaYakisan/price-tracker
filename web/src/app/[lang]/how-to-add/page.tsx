import type { Metadata } from "next";
import Link from "next/link";
import { Bookmarklet } from "@/components/Bookmarklet";
import { fill } from "@/i18n/config";
import { getDictionary, resolveLang } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/how-to-add">): Promise<Metadata> {
  const t = await getDictionary(await resolveLang(params));
  return { title: `${t.howTo.title} · ${t.meta.title}` };
}

export default async function HowToAddPage({ params }: PageProps<"/[lang]/how-to-add">) {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  const h = t.howTo;
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href={`/${lang}`} className="text-sm text-muted hover:text-ink">
        <span aria-hidden className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {t.common.allItems}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{h.title}</h1>
      <p className="mt-2 max-w-2xl text-muted text-pretty">{h.lead}</p>

      <ol className="mt-8 divide-y divide-line border-y border-line">
        <Way n={1} title={h.phoneTitle}>
          <Steps items={[h.phoneStep1, h.phoneStep2, h.phoneStep3]} />
          <p className="mt-3 text-sm text-muted">{h.phoneIphone}</p>
        </Way>
        <Way n={2} title={h.pasteTitle}>
          <Steps items={[h.pasteStep1, fill(h.pasteStep2, { button: t.track.submit })]} />
          <p className="mt-3 text-sm text-muted">{h.pasteNote}</p>
        </Way>
        <Way n={3} title={h.bookmarkTitle}>
          <Steps items={[h.bookmarkStep1, h.bookmarkStep2]} />
          <div className="mt-4">
            <Bookmarklet />
          </div>
        </Way>
      </ol>

      <Link
        href={`/${lang}`}
        className="mt-8 inline-flex h-11 items-center rounded-lg bg-accent px-6 text-sm font-semibold text-accent-ink hover:opacity-90"
      >
        {h.cta}
      </Link>
    </main>
  );
}

function Way({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 py-6">
      <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent tabular-nums" aria-hidden>
        {n}
      </span>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </li>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 ps-5 text-ink marker:text-faint">
      {items.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}
