// Structured data for the home page: tells search engines this is a site and a free web app.
export function homeJsonLd(o: { name: string; description: string; lang: string; origin: URL }): string {
  const url = new URL(`/${o.lang}`, o.origin).href;
  return JSON.stringify([
    { "@context": "https://schema.org", "@type": "WebSite", name: o.name, url, inLanguage: o.lang },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: o.name,
      url,
      description: o.description,
      applicationCategory: "ShoppingApplication",
      operatingSystem: "Any",
      inLanguage: o.lang,
      offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    },
  ]).replace(/</g, "\\u003c");
}
