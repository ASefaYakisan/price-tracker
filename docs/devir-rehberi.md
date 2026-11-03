# Price Tracker handover guide

This guide covers a new owner deploying with their own accounts. It does not authorize transferring existing users or their data. Never put credentials in this document, the repository, issues or PR comments.

## Agree on the handover

Record the repository and domain ownership being transferred, licensing rights, service costs, and whether existing data is included. The repository ships an MIT `LICENSE` for the source code (the owner may change it before a sale); this guide does not assume any revenue guarantee. Decide separately how existing users will be informed and how any permitted data transfer and deletion requests will be handled. Start with an empty database unless a reviewed transfer plan says otherwise.

## Set up the buyer's accounts

1. Create a Supabase project in the buyer's account. On a fresh database apply every SQL file in `supabase/migrations/` in filename order (currently 0001 through 0013), checking each result before continuing. Do not rerun initialization blindly on an existing database. Configure Auth site and redirect URLs for the buyer's deployment; review the enabled login providers and their configuration.
2. Import the repository into the buyer's Vercel account with `web` as the root directory and the Next.js preset. Configure the web variables from [Configuration](../README.md#configuration), then deploy. Public Supabase values and server-only service credentials have different roles; never expose server secrets through `NEXT_PUBLIC_*`. Set the production origin and verify login redirects after attaching the buyer's domain.
3. Create the buyer's Resend account, verify the sending domain and configure its DNS records. Set the buyer's Resend credential as an Actions secret and its verified sender as `ALERT_FROM`. Supabase authentication email is configured separately; a scraper Resend key alone does not configure Auth email.
4. In the buyer's GitHub repository, enable Actions and supply the scraper secrets and variables from [Configuration](../README.md#configuration). Set `SITE_URL` to the buyer's deployment. Review daily and pending-link schedules before enabling live collection. Optional ScraperAPI and Telegram integrations require the buyer's own accounts and limits. Do not copy the seller's credentials. The daily run also deletes `track_attempts` rows older than `TRACK_ATTEMPTS_KEEP_DAYS` days (default 90); without that cleanup the table grows forever and a full free-tier Supabase database turns read-only, which silently stops price reads and alerts.
5. If the separate owner setup guide (`docs/SETUP.md`, PR #89) has been merged, use its detailed setup checklist alongside this handover guide. This guide does not depend on that unmerged file.

Provider references: [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data), [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs). Follow the current provider instructions when configuring their dashboards.

## Validate before switching ownership

- Run `cd scraper && npm ci && npm test` and `cd web && npm ci && npm test && npx eslint src`; run the web production build in the deployment environment.
- Confirm the deployed site uses the buyer's database rather than demo data. Sign in with a test account, add one permitted product link, inspect its price history and create an alert.
- Run a controlled collector check and verify an email sent to a buyer-controlled test inbox. Confirm its product and alert-removal links use the buyer's site. Remove the test alert through the confirmation page.
- Check that schedules, paid request limits and provider billing are understood. A successful check for one product does not prove all stores work.
- Agree on the cutover and rollback before changing DNS or disabling the seller's deployment. After acceptance, remove former-owner access and rotate transferred credentials through the providers, never through committed files.

## Complete the legal drafts

The `/privacy` and `/terms` pages contain Turkish and English drafts; other interface languages display English. Supply the operator identity, a verified public contact address for account/data deletion, actual retention periods and provider settings. The contact address is not yet specified. Signed-in users can delete their own account from the Profile page’s Danger zone section (`DELETE /api/account`, confirmed by typing their email; it needs `SUPABASE_SERVICE_ROLE_KEY`). That removes their alerts and personal list; shared products and price history stay. Review backups and retention periods before making deletion promises.

Do not publish the drafts as final legal policies until the missing facts and applicable obligations have been reviewed. Cookies, analytics, provider retention settings and jurisdiction-specific terms are not established by this handover document.
