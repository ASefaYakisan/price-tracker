# Security policy

## Reporting a vulnerability

Use this repository's **Security** (or **Security and quality**) tab, then
**Advisories → Report a vulnerability**, to submit a private report when
private vulnerability reporting is enabled. Include the affected commit,
reproduction steps, expected impact and a minimal example without real user
data or credentials. Do not publish exploit details or secrets in public issues.

If the button is absent, private reporting is not available through that UI;
the maintainer must enable it. This policy does not itself enable the feature.
See [GitHub's private reporting instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately).

## Supported versions

Only the current `main` branch is supported. No separate maintenance policy
for older snapshots is defined here.

## What is protected

These are controls present in the repository, not an audit of a deployment.

- URL guards reject non-HTTP(S) schemes, embedded credentials, unresolved hosts
  and hosts resolving to blocked local/private addresses, including supported
  IPv6 representations: [web guard](web/src/lib/safe-url.ts) and
  [scraper guard](scraper/src/safe-url.js).
- Baseline response headers restrict framing, MIME sniffing, referrer details
  and selected browser permissions, and set HSTS:
  [security-headers.ts](web/src/lib/security-headers.ts), wired to all paths in
  [next.config.ts](web/next.config.ts).
- Link-add checks set account limits of 10 new links/hour, 30 owned links and
  30 read attempts/hour: [track-limits.ts](web/src/lib/track-limits.ts).
- RLS restricts account-owned alerts and personal lists; shared products are
  readable publicly, while custom products/history require list membership:
  [0005](supabase/migrations/0005_alert_owners.sql),
  [0010](supabase/migrations/0010_user_products.sql) and
  [0013](supabase/migrations/0013_private_custom_products.sql).
- Database triggers check alert creation limits (50/account, 20/hour) and
  require authenticated users' alert emails to match their JWT email:
  [0007](supabase/migrations/0007_alert_limits.sql) and
  [0014](supabase/migrations/0014_alert_email_own.sql).
- Signup supports the email-confirmation flow when enabled in Supabase; the
  supplied template includes a code and confirmation link:
  [AuthForm.tsx](web/src/components/AuthForm.tsx),
  [confirmation route](web/src/app/auth/confirm/route.ts),
  [email template](supabase/email-templates/confirm-signup.html) and
  [setup instructions](docs/SETUP.md).
- The sign-in form stores a browser-local delay after five wrong passwords,
  starting at 30 seconds and doubling for subsequent failures:
  [AuthForm.tsx](web/src/components/AuthForm.tsx).
- Optional Turnstile integration supplies captcha tokens to Supabase auth
  requests when configured: [Turnstile.tsx](web/src/components/Turnstile.tsx)
  and [configuration checklist](docs/guvenlik-kurulum.md).
- Account deletion requires a signed-in user and matching email confirmation,
  then deletes that account through the server-side admin client:
  [account-delete.ts](web/src/lib/account-delete.ts),
  [account endpoint](web/src/app/api/account/route.ts) and
  [handover limits](docs/devir-rehberi.md).

## Out of scope / known limits

- Source inspection does not verify deployed migrations, provider settings,
  delivery configuration or the availability of private GitHub reporting.
- Browser-local login delays can be bypassed by clearing browser storage;
  they are not a server-side account lock. Supabase enforcement depends on
  the operator's settings. Turnstile is optional and skipped without a site key.
- Link counts that fail to load are treated as zero; these checks fail open.
- The CSP only contains `frame-ancestors 'none'`; it is not a full script policy.
- Service-role access bypasses RLS. Alert-email ownership checks exclude
  non-authenticated roles and rows without an owner; existing rows are not
  retroactively checked by that migration.
- Deletion removes account-linked alerts and list entries through foreign-key
  cascades. Products/history remain; backups and retention need operator review.
- These controls do not establish that every network path, third-party service
  or deployment is free of vulnerabilities.

## Secrets

Supply credentials through environment variables and provider Secret settings,
not committed source. Keep local environment files private and use only
placeholders in example files. Server secrets must never use a `NEXT_PUBLIC_*`
name. See [README Configuration](README.md#configuration).
