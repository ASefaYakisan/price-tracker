# Setup guide

How to run your own copy of Price Tracker from scratch: your own Supabase project, your own Vercel deployment and your own GitHub Actions. Nothing in this repository points at anyone else's database; until you set the variables below the dashboard runs on demo data.

Order matters. Follow the steps top to bottom.

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com). Note the **Project URL**, the **anon (publishable) key** and the **service role key** (Project Settings → API). The service role key is a server secret: never put it in a `NEXT_PUBLIC_*` variable or commit it.
2. Apply **every** migration in `supabase/migrations/`, in order. Either paste each file into the SQL editor one by one, or link the project and push them all:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   | # | File | Adds |
   | --- | --- | --- |
   | 1 | `0001_init.sql` | `products`, `price_history`, `alerts`, the `product_latest` view, row level security |
   | 2 | `0002_price_precision.sql` | Wider price precision for crypto |
   | 3 | `0003_alert_signup.sql` | Alert sign-up from product pages |
   | 4 | `0004_alert_manage_token.sql` | Manage token for guest alerts |
   | 5 | `0005_alert_owners.sql` | Alerts owned by accounts |
   | 6 | `0006_product_owners.sql` | Product owners |
   | 7 | `0007_alert_limits.sql` | Alert limits per account and per hour |
   | 8 | `0008_track_attempts.sql` | Log of every pasted-link read |
   | 9 | `0009_product_status.sql` | Pending / active / failed link status |
   | 10 | `0010_user_products.sql` | Per-user "My list" |
   | 11 | `0011_usage_stats.sql` | Aggregate usage numbers for the owner |
   | 12 | `0012_alert_lang.sql` | Language saved on alerts |

   A test (`scraper/test/migrations.test.js`) fails if a migration is missing from the numbering, so add new files as `0013_...` and extend this table.
3. Authentication → URL Configuration: set **Site URL** to your deployed address and add `https://<your-domain>/auth/callback` and `https://<your-domain>/auth/confirm` to the redirect URLs.
4. Authentication → Email: turn on **Confirm email**, then paste `supabase/email-templates/confirm-signup.html` and `reset-password.html` into the matching templates. Before pasting, change the two things that are fixed to the original site: the logo `src` (point it at your own copy of `web/public/email-logo.png`) and the footer link (your domain).
5. Optional hardening (Turnstile, rate limits, code length) is in [`guvenlik-kurulum.md`](guvenlik-kurulum.md) (Turkish).

## 2. Deploy the dashboard (Vercel)

Import the repository in Vercel and set the root directory to `web`. Add these under Settings → Environment Variables for **Production**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key (server only) |

Without the two `NEXT_PUBLIC_*` values the site shows demo data. The full list of optional variables (Turnstile, admin emails, instant link reading) is in the README under [Configuration](../README.md#configuration). Redeploy after changing variables.

## 3. Configure GitHub Actions

In your repository: Settings → Secrets and variables → Actions.

- Variable `SUPABASE_URL`: your Project URL.
- Variable `SITE_URL`: your dashboard address (used for links in emails).
- Secret `SUPABASE_SERVICE_ROLE_KEY`: your service role key.
- Optional: `RESEND_API_KEY` and `ALERT_FROM` for email alerts, `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`, `SCRAPER_API_KEY` for blocked shops. See the README for what each does.

## 4. First run

1. Actions → **Scrape** → Run workflow. It collects the built-in sources and refreshes pasted links; the schedule then runs it daily.
2. The **Pending links** workflow runs every 15 minutes on its own and retries links a shop turned away.
3. Optional: Actions → **Shop probe** shows which shops can be read from GitHub's servers.

## 5. Check that it works

- [ ] The dashboard shows live data, not the demo banner.
- [ ] You can sign up, receive the confirmation code and sign in.
- [ ] Pasting a product link adds it, and a price appears (or the link shows as pending and fills in within a few minutes).
- [ ] The **Scrape** run is green and new rows appear in `price_history`.
- [ ] An alert whose target is already reached sends an email (needs `RESEND_API_KEY`).

## Local development

See the README "Run it" section. Copy `web/.env.example` to `web/.env.local` and the root `.env.example` to `.env`; leave the values empty for demo mode.
