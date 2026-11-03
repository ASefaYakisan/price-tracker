// Stores the price reader was tested against. Source: docs/supported-stores.md
// (22 Oct 2026 probe of 12 stores, 3 Nov 2026 probe of foreign shops, plus manual checks). Update both together.
// "works" means a tested product page was read; it is not a guarantee for every product.
export type StoreStatus = "works" | "limited";

export type StoreRegion = "turkey" | "international";

export type SupportedStore = { name: string; domain: string; status: StoreStatus; region: StoreRegion };

export const STORES_TESTED_ON = "2026-11-03";

export const SUPPORTED_STORES: readonly SupportedStore[] = [
  { name: "Trendyol", domain: "trendyol.com", status: "works", region: "turkey" },
  { name: "Hepsiburada", domain: "hepsiburada.com", status: "works", region: "turkey" },
  { name: "Amazon Türkiye", domain: "amazon.com.tr", status: "works", region: "turkey" },
  { name: "Amazon", domain: "amazon.com", status: "works", region: "international" },
  { name: "Vatan Bilgisayar", domain: "vatanbilgisayar.com", status: "works", region: "turkey" },
  { name: "MediaMarkt", domain: "mediamarkt.com.tr", status: "works", region: "turkey" },
  { name: "Teknosa", domain: "teknosa.com", status: "works", region: "turkey" },
  { name: "Boyner", domain: "boyner.com.tr", status: "works", region: "turkey" },
  { name: "LC Waikiki", domain: "lcw.com", status: "works", region: "turkey" },
  { name: "eBay", domain: "ebay.com", status: "works", region: "international" },
  { name: "Akakçe", domain: "akakce.com", status: "works", region: "turkey" },
  { name: "İtopya", domain: "itopya.com", status: "works", region: "turkey" },
  { name: "IKEA", domain: "ikea.com", status: "works", region: "international" },
  { name: "n11", domain: "n11.com", status: "limited", region: "turkey" },
  { name: "Decathlon", domain: "decathlon.com.tr", status: "limited", region: "turkey" },
];
