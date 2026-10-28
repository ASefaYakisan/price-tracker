# Price Tracker

[![CI](https://github.com/ASefaYakisan/price-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/ASefaYakisan/price-tracker/actions/workflows/ci.yml)

## Product overview

Price Tracker helps shoppers keep a watchlist instead of revisiting product pages manually. Paste a product link, inspect the observed price history and set a target-price email alert. It is also a starting point for an owner who wants to operate a price-monitoring service with their own infrastructure accounts.

The dashboard includes search and filters, personal lists, alerts, price charts, CSV/Excel exports, 24 interface languages and light/dark themes. Scheduled collection also supports market data. Store coverage varies: blocked pages may remain unreadable, and newly tracked shop products do not come with invented historical prices. The screenshots below show the dashboard and product history; they are examples, not a guarantee of current store coverage or business revenue.

The system combines a Next.js/TypeScript web app on Vercel, a Node.js collector running through GitHub Actions, Supabase data storage and accounts, Resend alert email, and optional ScraperAPI fallback reads. These services have separate accounts, limits and running costs.

For handover, the buyer supplies their own service accounts and configuration, applies all database migrations in order to a new database, and validates collection and notifications. See [Configuration](#configuration) and the [handover guide](docs/devir-rehberi.md). Existing user data, account credentials, domain ownership and software licensing require an explicit handover agreement; a code transfer alone does not settle them. The privacy and terms pages are drafts that the operator must complete before launch.

**Live demo:** https://price-tracker-shop.vercel.app

A Node.js scraper collects prices from four sources on a schedule (an e-commerce catalogue, crypto, exchange rates and gold) and stores every run in Supabase (Postgres). A Next.js dashboard shows current prices, the change since the last run and stock status.

![Dashboard](panel-onizleme.png)

![Price history](urun-grafik.png)

<details><summary>Dark mode</summary>

![Dark mode](panel-koyu.png)

</details>

## Structure

| Folder | What it does |
| --- | --- |
| `scraper/` | Node.js 20+ collector. One adapter per source (`src/adapters/`): HTML crawling with pagination (books.toscrape.com), JSON APIs (CoinGecko, gold) and XML (Central Bank of Türkiye rates). Polite fetching with retries; one failing source never blocks the others. Saves to Supabase, or to local JSON when no credentials are set. |
| `supabase/migrations/` | Tables `products`, `price_history`, `alerts`, the `product_latest` view and row level security. |
| `web/` | Next.js dashboard: search, filters and sorting, per-product price history chart, Excel and CSV export, light and dark themes. Shows demo data until Supabase is connected. |

## Run it

```bash
# 1. Database: paste supabase/migrations/0001_init.sql into the Supabase SQL editor
# 2. Scraper
cd scraper && npm install
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run scrape -- all 3   # or a single source: coingecko, tcmb, gold, books-toscrape
npm test
# 3. Dashboard
cd ../web && npm install
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run dev
npm test   # runs the shared shop fixtures in scraper/test/fixtures/shops against the web extractor
```

## Daily schedule

`.github/workflows/scrape.yml` runs every day at 06:00 UTC and can also be started from Actions. Set the repository secrets and variables listed in [Configuration](#configuration).

## Configuration

For local scraper runs, copy the root `.env.example` to `.env` and load it explicitly, for example `cd scraper && node --env-file=../.env src/index.js all 3`. The scraper does not automatically load dotenv files. For the dashboard, copy `web/.env.example` to `web/.env.local`; Next.js loads it automatically. Never commit populated local files or put server secrets in `NEXT_PUBLIC_*` variables.

In the table, **Secret** and **Variable** mean GitHub repository Settings → Secrets and variables → Actions. Web values go in Vercel project environment settings (or `web/.env.local` locally); scraper values can also be supplied through the local root `.env`.

| Variable | Consumer | Required? | Where to set | Purpose / default |
| --- | --- | --- | --- | --- |
| `SUPABASE_URL` | scraper | For database storage | Actions Variable / root `.env` | Project API URL; without both database values the collector writes local JSON. |
| `SUPABASE_SERVICE_ROLE_KEY` | scraper, web server | For database writes and server alert operations | Actions Secret / root `.env`; Vercel / `web/.env.local` | Server-only database credential; no default. Never expose to the browser. |
| `NEXT_PUBLIC_SUPABASE_URL` | web | For live data and accounts | Vercel / `web/.env.local` | Project API URL; missing URL or public key enables demo data. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | For live data and accounts | Vercel / `web/.env.local` | Public anon/publishable key, subject to database RLS; no default. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | web | Optional | Vercel / `web/.env.local` | Public Cloudflare widget key; omitted means no widget. Configure its matching secret in Supabase Auth CAPTCHA settings, not in this repo. |
| `SCRAPER_USER_AGENT` | scraper | Optional | Actions Variable / root `.env` | Request user agent; `PriceTrackerBot/0.1`. |
| `COINGECKO_API_KEY` | scraper | Optional | Actions Secret / root `.env` | CoinGecko demo API key; omitted uses unauthenticated requests. |
| `RESEND_API_KEY` | scraper | For email delivery | Actions Secret / root `.env` | Enables alert emails; otherwise due alerts are only logged. |
| `ALERT_FROM` | scraper | Optional | Actions Variable / root `.env` | Verified email sender; `Price Tracker <onboarding@resend.dev>`. |
| `SITE_URL` | scraper | Optional | Actions Variable / root `.env` | Dashboard origin for email/digest links; otherwise links use the shop URL. |
| `TELEGRAM_BOT_TOKEN` | scraper | For Telegram | Actions Secret / root `.env` | Bot credential; missing token or chat ID skips Telegram. |
| `TELEGRAM_CHAT_ID` | scraper | For Telegram | Actions Secret / root `.env` | Destination chat; no default. |
| `TELEGRAM_LANG` | scraper | Optional | Local root `.env` / process environment | Digest language: `en` (default), `tr`, `de`, `fr`, `es`; unknown values fall back to English. |
| `TELEGRAM_MIN_DROP` | scraper | Optional | Local root `.env` / process environment | Minimum percentage drop; `2` when unset. Current workflows do not forward this setting, so scheduled runs use 2%. Do not set it to an empty string (that becomes zero). |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | scraper | For Sheets | Actions Secret / root `.env` | Service account JSON; missing credentials or sheet ID skips sync. |
| `GOOGLE_SHEET_ID` | scraper | For Sheets | Actions Secret / root `.env` | Target spreadsheet ID; no default. |
| `GITHUB_DISPATCH_TOKEN` | web server | Optional | Vercel / `web/.env.local` | Fine-grained GitHub token (this repo, Actions read/write). With `GITHUB_DISPATCH_REPO` it starts the Pending links workflow as soon as a link is saved unread; without it the 15-minute schedule is the only trigger. |
| `GITHUB_DISPATCH_REPO` | web server | Optional | Vercel / `web/.env.local` | `owner/repo` that holds the workflow; `GITHUB_DISPATCH_REF` picks the branch (`main`). |
| `SCRAPER_API_KEY` | scraper | Optional | Actions Secret / root `.env` | Enables the paid fallback; see [Blocked shops](#blocked-shops-optional-scraping-api). Disabled without a key. |
| `UNBLOCK_HOSTS` | scraper | Optional | Actions Variable / root `.env` | Comma-separated hosts sent directly to the paid fallback; empty by default. |
| `UNBLOCK_MONTHLY_LIMIT` | scraper | Optional | Actions Variable / root `.env` | Monthly credit ceiling; `900`; `0` disables paid reads. |
| `SCRAPE_BUDGET_MINUTES` | scraper | Optional | Actions Variable | Minutes after which the daily refresh starts no new link (default `30`); skipped links are read first next run. |
| `UNBLOCK_COUNTRY` | scraper | Optional | Actions Variable / root `.env` | Country code; `tr`; `none` lets the API choose. |
| `UNBLOCK_RENDER_HOSTS` | scraper | Optional | Actions Variable / root `.env` | Comma-separated hosts needing JavaScript rendering; empty by default. |
| `UNBLOCK_PREMIUM_HOSTS` | scraper | Optional | Actions Variable / root `.env` | Comma-separated hosts needing premium requests; empty by default. |
| `PROBE_API` | scraper probe | Optional | Local root `.env` / process environment | `0` disables the probe's paid fallback. Otherwise it uses the configured API key. The weekly scheduled run sets it to `0`; a manual run sets it from the `api` input. |
| `GITHUB_STEP_SUMMARY` | scraper probe | Automatic in Actions | Provided by GitHub Actions | Output file for the probe report; do not configure as a secret or variable. No file is written when absent. |

## Track any product by link

Paste a product page link on the dashboard. The server reads the price through a chain of layers, and the first one that finds a price wins: JSON-LD `Product`/`Offer` (including `AggregateOffer` and the variant that matches the link), schema.org microdata (attribute or visible text), `product:price` meta tags, the state JSON that shops embed for their own JavaScript (`__NEXT_DATA__`, `__INITIAL_STATE__` and similar), and finally small per-shop adapters (Trendyol, Hepsiburada, Amazon, n11). It saves the product, and the daily job re-checks every added link (`source = custom`). A link the shop turns away is kept as pending and retried from GitHub Actions every 15 minutes; when a plain request still fails, the scraper opens the page in a real Chromium (Playwright, `scraper/src/browser-fetch.js`) so prices drawn by scripts can be read too. Links that resolve to private network addresses are refused. See [Configuration](#configuration) for the required server-side database credential.

Every read of a pasted link, when it is added and on each daily refresh, is logged to the `track_attempts` table with its outcome (`ok`, `http_error`, `no_price`, `timeout`, `network`), the HTTP status and which layer held the price (`json-ld`, `microdata`, `meta`, `embedded-state`, `shop-adapter`, or `browser/...` when the real browser read it). Visitors see a message that matches the reason, in their language.

To measure which shops can be read, run the **Shop probe** workflow from the Actions tab (or `cd scraper && npm run probe`, optionally followed by links). It opens the sample product pages in `scraper/probe-urls.txt` and writes a per-shop table (HTTP code, HTML size, JSON-LD present, price found, layer) to the job summary. The workflow also runs every Monday without the paid API, saves `probe-report.json` as an artifact, and fails when a link that read a price in the last good run no longer does.

## Blocked shops (optional scraping API)

Reading a pasted link goes through layers, cheapest first:

1. **Plain request** with browser headers, from the server that runs the job.
2. **Markup layers** on the page that came back: JSON-LD, microdata, price meta tags, the state JSON shops embed for their own scripts, and small per-shop adapters (Trendyol, Hepsiburada, Amazon, n11).
3. **Pending links**: when the shop turns the site's server away (401/403/429/503 or a timeout), the link is saved without a price and the **Pending links** workflow retries it from GitHub's servers every 15 minutes for two days.
4. **Real browser**: when the plain request is still turned away or finds no price, the scraper opens the page in a headless Chromium (Playwright, `scraper/src/browser-fetch.js`), lets its scripts run and reads the rendered page. Free, so it always comes before the paid layer.
5. **Scraping API** (optional, off by default): some shops block every datacenter address, real browser included. With a [ScraperAPI](https://www.scraperapi.com/) key, the scraper retries links that both the plain request and the browser were turned away from through the API, which opens the page from a residential address. The markup layers then read the price as usual.

The scraping API costs credits, so it is used only when needed:

| Setting | Where | What it does |
| --- | --- | --- |
| `SCRAPER_API_KEY` | Actions secret | Turns the layer on. Without it nothing changes. |
| `UNBLOCK_HOSTS` | Actions variable, optional | Comma-separated shops read through the API straight away, skipping the plain request and the browser, e.g. `vatanbilgisayar.com,trendyol.com`. Other shops use it only after both the plain request and the browser were blocked. |
| `UNBLOCK_MONTHLY_LIMIT` | Actions variable, optional | Credits per calendar month (default 900). A plain read costs 1, a rendered or premium read 10. When reached, the layer switches off until the next month. |
| `UNBLOCK_COUNTRY` | Actions variable, optional | Country the API opens pages from (default `tr`; `none` lets the API choose). Trendyol shows a country picker instead of the product to foreign addresses. If the plan does not offer that country, the request is repeated without it. |
| `UNBLOCK_RENDER_HOSTS` | Actions variable, optional | Comma-separated shops whose page is an empty app shell until its scripts run, so the API renders it first (`render=true`, 10 credits). Empty by default. |
| `UNBLOCK_PREMIUM_HOSTS` | Actions variable, optional | Comma-separated shops the standard API cannot open (it answers 500), read with `premium=true` (10 credits). Empty by default. |

Requests are counted from `track_attempts`: reads through the API are logged with the layer `unblock` (failed) or `unblock:<markup>` (price found, e.g. `unblock:json-ld`), rendered and premium reads as `unblock-plus...`. A pending link that failed through the API is not sent again for 24 hours. If the monthly count cannot be read, no paid request is made.

## Telegram and Google Sheets

Both integrations are optional; see [Configuration](#configuration) for their settings. Telegram posts price drops after each run. Google Sheets replaces the `Latest` tab and appends to `History`; share the spreadsheet with the service account as Editor.

## Public API

Read-only JSON, no key needed, CORS open. Interactive docs (Swagger UI): [`/docs`](https://price-tracker-shop.vercel.app/docs), spec at `/api/openapi.json`.

| Endpoint | Returns |
|---|---|
| `GET /api/products?source=&q=&limit=` | Items with latest price and change |
| `GET /api/products/{id}` | One item |
| `GET /api/products/{id}/history?days=90` | Price per scrape, oldest first |

## Price alerts

Visitors leave an email and a target price on any product page. After every scrape the job emails each alert whose target is reached, once, then marks it sent. Emails go through [Resend](https://resend.com): see [Configuration](#configuration) to enable sending; otherwise the job only logs which alerts are due. Alerts are write-only for the public (RLS insert policy, no read access).

### Alert verification

A price reader can occasionally catch the wrong number (an instalment amount, a shipping fee, kuruş read as lira). If the latest reading is below half or above five times the reading before it, the alert is held and logged as a suspicious jump; it is sent only when the next scrape reads the same price again. Ordinary drops alert immediately, and products with no earlier reading behave as before.

Guests manage their alerts from the browser that created them: each alert has a secret manage token that only that browser holds.

## Accounts

Email and password sign in with Supabase Auth (`@supabase/ssr`, session cookies refreshed in `src/proxy.ts`). Signed-in users' alerts are saved to their account and readable on any device. Row level security lets each user read, change and delete only their own rows (`supabase/migrations/0005_alert_owners.sql`). Alerts made as a guest move into the account on first sign in. Each user also keeps their own list of tracked items (`user_products`, `supabase/migrations/0010_user_products.sql`): two people can follow the same link, and one leaving it never removes the other's item, price history or alerts. The home page splits items into My list, Products (links people added), Markets and Samples. Password reset links open in a separate in-memory session, so they never sign in other tabs. A "Continue with Google" button appears on its own once the Google provider is switched on in Supabase.

## Languages

The interface ships in 24 languages, from English and Turkish to Arabic (right to left), Chinese and Japanese. Pages live under a language segment (`/tr/alerts`); bare links redirect to the saved choice, then the browser's language, then English. Prices, dates and percentages use the reader's number format, and the Excel and CSV downloads come with translated headers (CSV switches to `;` and decimal commas where spreadsheets expect them). Texts are in `web/src/i18n/dictionaries`, one typed file per language.

## Adding a site

Create `scraper/src/adapters/<site>.js` exporting `name` and either `startUrl` + `parseListing(html, pageUrl)` returning `{ products, nextUrl }` (HTML sites) or `fetchAll()` returning products (APIs), then register it in `src/index.js`.

## Roadmap

- [x] Scraper with pagination and retries, unit-tested parser
- [x] Supabase schema with price history
- [x] Dashboard with price change and stock status
- [x] Price history chart per product (hover tooltip, table view)
- [x] Excel (.xlsx) and CSV export (`/api/export?format=xlsx|csv`, spreadsheet-safe)
- [x] Search, filters (drops, rises, out of stock) and sorting
- [x] Light and dark themes, mobile layout
- [x] Multiple sources: crypto (CoinGecko), exchange rates (TCMB XML), gold
- [x] Public JSON API with OpenAPI spec and Swagger UI
- [x] Track any product by pasting its link (JSON-LD, microdata, meta, embedded state JSON and shop adapters)
- [x] Google Sheets sync
- [x] Telegram price-drop digest
- [x] Price-drop email alerts (sign up on the product page, sent after each scrape via Resend)
- [x] Daily schedule (GitHub Actions cron)
