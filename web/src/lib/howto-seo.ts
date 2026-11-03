// Structured data for the "how to add a product" page: the three ways to add a link, as HowTo steps.
export function howToJsonLd(o: { name: string; description: string; lang: string; url: string; ways: readonly { title: string; steps: readonly string[] }[] }): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: o.name,
    description: o.description,
    inLanguage: o.lang,
    url: o.url,
    step: o.ways.map((w, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: w.title,
      itemListElement: w.steps.map((text, j) => ({ "@type": "HowToDirection", position: j + 1, text })),
    })),
  }).replace(/</g, "\\u003c");
}
