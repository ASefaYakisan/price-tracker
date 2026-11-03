// Stores the price reader was tested against. Source: docs/supported-stores.md
// (22 Oct 2026 probe of 12 stores, plus manual checks). Update both together.
// "works" means a tested product page was read; it is not a guarantee for every product.
export type StoreStatus = "works" | "limited";

export type SupportedStore = { name: string; domain: string; status: StoreStatus };

export const STORES_TESTED_ON = "2026-11-03";

export const SUPPORTED_STORES: readonly SupportedStore[] = [
  { name: "Trendyol", domain: "trendyol.com", status: "works" },
  { name: "Hepsiburada", domain: "hepsiburada.com", status: "works" },
  { name: "Amazon Türkiye", domain: "amazon.com.tr", status: "works" },
  { name: "Amazon", domain: "amazon.com", status: "works" },
  { name: "Vatan Bilgisayar", domain: "vatanbilgisayar.com", status: "works" },
  { name: "MediaMarkt", domain: "mediamarkt.com.tr", status: "works" },
  { name: "Teknosa", domain: "teknosa.com", status: "works" },
  { name: "Boyner", domain: "boyner.com.tr", status: "works" },
  { name: "LC Waikiki", domain: "lcw.com", status: "works" },
  { name: "eBay", domain: "ebay.com", status: "works" },
  { name: "Akakçe", domain: "akakce.com", status: "works" },
  { name: "İtopya", domain: "itopya.com", status: "works" },
  { name: "Zalando", domain: "zalando.de", status: "works" },
  { name: "n11", domain: "n11.com", status: "limited" },
  { name: "Decathlon", domain: "decathlon.com.tr", status: "limited" },
  { name: "Amazon Germany", domain: "amazon.de", status: "limited" },
  { name: "Amazon UK", domain: "amazon.co.uk", status: "limited" },
  { name: "Walmart", domain: "walmart.com", status: "limited" },
  { name: "Best Buy", domain: "bestbuy.com", status: "limited" },
  { name: "Target", domain: "target.com", status: "limited" },
  { name: "AliExpress", domain: "aliexpress.com", status: "limited" },
];
