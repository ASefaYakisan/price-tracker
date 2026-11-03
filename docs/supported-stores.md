# Supported stores

These are dated observations for tested product pages, not a guarantee that every product in a store can be read. Historical results below come from [issue #163](https://github.com/ASefaYakisan/price-tracker/issues/163); no fresh probe was run for this document.

## Reading layers

Price extraction tries JSON-LD, microdata, meta tags, embedded state and shop-specific adapters. A real Chromium browser can render blocked or script-driven pages; optional ScraperAPI provides another fallback (configured hosts may use it first). See [reading product links](../README.md#track-any-product-by-link) and [optional scraping API](../README.md#blocked-shops-optional-scraping-api) for the full chain and configuration.

## Observed coverage

The **22 October 2026 probe** read prices from 10 of 12 stores. Per-store layers were not supplied except for Trendyol; an adapter's presence in code does not establish which layer succeeded.

| Store | Successful layer / route | Observed status |
| --- | --- | --- |
| Trendyol | ScraperAPI with Turkey location; extraction layer not specified | Readable in 22 October probe |
| Hepsiburada | Not specified | Readable in 22 October probe |
| Amazon.com.tr | Not specified | Readable in 22 October probe |
| Amazon.com | Not specified | Readable in 22 October probe |
| Vatan | Not specified | Readable in 22 October probe |
| MediaMarkt | Not specified | Readable in 22 October probe |
| Teknosa | Not specified | Readable in 22 October probe |
| Boyner | Not specified | Readable in 22 October probe |
| LC Waikiki | Not specified | Readable in 22 October probe |
| eBay | Not specified | Readable in 22 October probe |
| n11 | Not specified | Not readable in 22 October probe |
| Decathlon | Not specified | Not readable in 22 October probe |
| Akakçe | Not specified | Manual product-page test succeeded; date not supplied |
| İtopya | Not specified | Manual product-page test succeeded; date not supplied |

### Foreign stores (3 November 2026 probe, GitHub Actions)

Eight sample links, plain request, real Chromium, then ScraperAPI opened from the shop's own country; a second run tried premium requests for Amazon, Walmart, Best Buy and AliExpress and a rendered request for Target.

| Store | Result |
| --- | --- |
| Zalando (zalando.de) | Read: 107.95 EUR through JSON-LD, no API credit needed |
| Amazon.de, Amazon.co.uk | Limited: the plain request is refused and ScraperAPI answers HTTP 403, also with premium |
| Walmart | Limited: Chromium gets a page without a price; ScraperAPI answers HTTP 403, also with premium |
| Best Buy | Limited: the request times out from GitHub's servers |
| Target | Limited: the page loads but the price is filled in by scripts (placeholder in the HTML); the API was not reached because the page answered 200 |
| AliExpress | Limited: from GitHub's US address the item shows "unavailable in your location" |

Amazon.com was read in the 22 October probe; Amazon.de/.co.uk were not. The 403 from ScraperAPI may be a plan restriction rather than a shop block; the response body was not captured. Pasted links from limited shops are saved as pending and retried (see Limits).

Issue #163 also reports **11–13 days of price history** for Hepsiburada, Akakçe, Trendyol and İtopya during **21 October–1 November 2026**. The manual checks and history are separate from the 12-store probe.

The current [sample URL list](../scraper/probe-urls.txt) includes additional stores. A URL being listed is not evidence of a successful price read. [Probe code](../scraper/src/probe.js) records the price, layer and outcome in `probe-report.json` for new measurements.

## Limits

- Prices are normally checked once a day; alerts follow the daily read, not an instant price change.
- Stores can change their markup or bot protection and stop working.
- Issue #163 records a ScraperAPI free-plan allowance of **1,000 credits per month**. This is the supplied allowance, not a newly verified provider offer. Rendered or premium requests can consume more than one credit; see the [API configuration](../README.md#blocked-shops-optional-scraping-api).
- Repeated failures reduce refresh frequency: [refresh scheduling](../scraper/src/refresh.js) uses 2-, 4- or 7-day retry intervals after increasing failure counts, capped at 2 days for products with alerts. Scheduling slack and available read budgets also affect timing.

## Adding a store

1. Add a real, public product-page URL with a store comment to [probe-urls.txt](../scraper/probe-urls.txt). Avoid search pages and tracking parameters.
2. Run **Shop probe** in GitHub Actions with the API input unchecked for an initial unpaid measurement. Inspect its summary and `probe-report` artifact for the actual price, layer and outcome. The [workflow](../.github/workflows/probe.yml) also runs weekly without the paid API.
3. If extraction fails, inspect the existing pasted-link route in [adapters/custom.js](../scraper/src/adapters/custom.js) and the generic readers and `SHOP_ADAPTERS` in [extract-price.js](../scraper/src/extract-price.js). Have the responsible maintainer extend extraction only where needed, keep [the web copy](../web/src/lib/extract-price.ts) in sync, and add a representative fixture in [the shop fixtures](../scraper/test/fixtures/shops/).
4. Run both projects' tests, then repeat the probe and compare the price and currency with the product page. If measuring ScraperAPI separately, explicitly enable it: probe requests can consume provider credits and are not logged against the application's local monthly counter. Update this table with the measurement date and evidence, including any failed result.
