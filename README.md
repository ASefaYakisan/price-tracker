# Price Tracker

A Node.js scraper collects product prices on a schedule and stores every run in Supabase (Postgres). A Next.js dashboard shows current prices, the change since the last run and stock status.

![Dashboard](panel-onizleme.png)

![Price history](urun-grafik.png)

## Structure

| Folder | What it does |
| --- | --- |
| `scraper/` | Node.js 20+ crawler. One adapter per site (`src/adapters/`), polite fetching with retries, pagination. Saves to Supabase, or to local JSON when no credentials are set. |
| `supabase/migrations/` | Tables `products`, `price_history`, `alerts`, the `product_latest` view and row level security. |
| `web/` | Next.js dashboard: product list, per-product price history chart, CSV export. Shows demo data until Supabase is connected. |

## Run it

```bash
# 1. Database: paste supabase/migrations/0001_init.sql into the Supabase SQL editor
# 2. Scraper
cd scraper && npm install
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run scrape -- books-toscrape 5
npm test
# 3. Dashboard
cd ../web && npm install
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run dev
```

## Adding a site

Create `scraper/src/adapters/<site>.js` exporting `name`, `startUrl` and `parseListing(html, pageUrl)` returning `{ products, nextUrl }`, then register it in `src/index.js`.

## Roadmap

- [x] Scraper with pagination and retries, unit-tested parser
- [x] Supabase schema with price history
- [x] Dashboard with price change and stock status
- [x] Price history chart per product (hover tooltip, table view)
- [x] CSV export (`/api/export`, spreadsheet-safe)
- [ ] Google Sheets sync
- [ ] Price-drop email alerts
- [ ] Daily schedule (GitHub Actions cron)
