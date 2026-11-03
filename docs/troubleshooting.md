# Troubleshooting

## Why does my link say Pending or Couldn't read?

Pasted products use `pending`, `active` and `failed`; `ok` is a read-attempt
outcome, not a product status. In the interface, a custom product with no
successful reading is **Pending**, unless explicitly marked `failed`, which
shows **Couldn't read**. With a successful reading it is treated as `active`
and has no status pill. Non-custom sources have no pasted-link status pill.
A successful scraper read clears the last error and resets the failure count.

Source: `web/src/lib/link-status.ts`, `web/src/components/LinkStatus.tsx`,
`web/src/i18n/dictionaries/en.ts`, `scraper/src/link-status.js`.

## Who retries a pending link, and for how long?

The web server tries when a link is added. Blocked responses (401/403/429/503),
timeouts and recognized script-rendered pages can be saved for the GitHub
scraper. The Pending links workflow is scheduled every 15 minutes; an optional
web dispatch can start it sooner. Dispatch needs the configured repository and
token, and skips queued/waiting runs or runs started within the last minute.
Failures to dispatch leave the scheduled retry available.

The current pending reader selects up to 50 custom products without a price,
excluding `failed`. **Three failed pending checks** mark a product failed.
The current code has no 48-hour age cutoff: the README's older “two days”
description does not match this implementation. Queue size, workflow execution
and provider limits mean the schedule is not a completion-time guarantee.

Source: `web/src/app/api/track/route.ts`, `web/src/lib/track-outcome.ts`,
`web/src/lib/dispatch-pending.ts`, `scraper/src/pending.js`,
`scraper/src/link-status.js`, `.github/workflows/pending.yml`.

## Does a failed link stop being checked forever?

No. It leaves the pending queue but remains eligible for the daily refresh.
Repeated failures reduce its reading frequency: after 3–6 failures it rests
2 days, after 7–13 it rests 4 days, and after 14 or more it rests 7 days.
For products with open alerts, the rest interval is capped at 2 days. There is
3-hour scheduling slack; the run's time budget can also defer reads.
The interface's “We still check it once a day” text is therefore not an exact
promise for repeatedly failing links.

The original adding account can use **Try again** on a failed custom link.
That resets `failed_checks` to zero and queues it as pending. The interface
says “Queued. We will try again within 15 minutes.” Actual execution still
depends on the scheduled worker. Simply following someone else's link does
not grant the original-adder retry permission.

Source: `scraper/src/refresh.js`, `scraper/src/adapters/custom.js`,
`web/src/app/api/track/[id]/retry/route.ts`, `web/src/i18n/dictionaries/en.ts`.

## Why can I open the shop while the tracker cannot read its price?

Shops can block automated requests, return a robot-check page even with HTTP
200, render prices only with scripts, return no recognizable price, time out,
or remove the page (404/410). A successful visit in your browser does not prove
that the server receives the same page. The scraper can try a real browser
and an optional scraping API, but neither guarantees access.

Check that the URL opens one product, not search results or a category. For
a missing page, use its current product link. For temporary errors, try later;
use **Try again** when offered. See [supported stores](supported-stores.md)
for dated observations, not an unconditional compatibility list.

Source: `web/src/lib/track-outcome.ts`, `scraper/src/track-outcome.js`,
`scraper/src/pending.js`, `README.md` (Blocked shops), `docs/supported-stores.md`.

## Why is a price still shown after the latest check failed?

A daily failure records the error without discarding an earlier successful
price. When the failed check is newer than the last successful reading, the
interface says the displayed price is from the last successful read. Check
that timestamp before treating the amount as current.

Source: `scraper/src/link-status.js`, `web/src/lib/link-status.ts`,
`web/src/components/LinkStatus.tsx`, `web/src/i18n/dictionaries/en.ts`.

## Why has my price-alert email not arrived?

- Check the direction and target: `below` fires at or below the target;
  `above` fires at or above it. Missing direction uses below behavior.
- A missing price or explicitly out-of-stock product is not due. An unreadable
  link cannot supply a fresh price; inspect its latest-read warning. The sender
  does not independently require a freshness timestamp for the saved price.
- Each open alert sends once; an already-sent alert is excluded. Edit/rearm it
  through the interface to watch again.
- A suspicious jump (below half or above five times the preceding price) is
  held for another reading; alerts follow scrape runs, not instant shop changes.
- Operators should inspect the Scrape run and mail errors, and check Resend
  configuration. Without `RESEND_API_KEY`, sending is a logged dry run. A failed
  send normally reopens the alert; failure to reopen is logged and can prevent retry.
- Check your spam/junk folder as a manual delivery check. Repository code
  cannot establish where a mailbox provider placed a message.

Source: `scraper/src/alerts.js`, `scraper/src/price-sanity.js`,
`web/src/i18n/dictionaries/en.ts`, `README.md` (Price alerts / Configuration).

## When does the unreadable-link warning arrive: after seven days?

The code selects open alerts when `failed_checks` is **exactly 7** and a last
error exists. This is a count of consecutive failed readings, not elapsed days.
Pending attempts and slower retry intervals mean it need not equal seven
calendar days. The email currently calls that count “days”; do not interpret
that wording as a timer guarantee. A successful reading resets the count.

The warning does not close the price alert. There is no separate persisted
warning-delivery marker: selection is based on the counter, so an unchanged
count can be selected again, and later recovery/failure can reach seven again.
Delivery still needs working email configuration. Check the product URL;
if it moved, add the new link and remove the old alert.

Source: `scraper/src/alerts.js` (`DEAD_LINK_AFTER_CHECKS`, `deadLinkAlerts`,
`notifyDeadLinks`), `scraper/src/link-status.js`, `scraper/src/refresh.js`,
`scraper/src/alert-i18n.js`.

## Why did my signup or password-reset email not arrive?

These messages use Supabase Auth, separately from Resend price alerts. Check
the entered address and any form error. The signup form offers **Send a new
code** after a 60-second wait. If a code/link is expired, request a new one;
do not share the code. A normal password sign-in is not itself an email request.

Operators should follow [SETUP](SETUP.md): enable email confirmation, install
the supplied confirmation/reset templates, and configure the site URL and
redirect URLs. Follow [the auth setup checklist](guvenlik-kurulum.md) for code
length and optional Turnstile settings. Templates contain static English copy;
their presence in the repo does not prove they are installed or delivery works.
The live provider's configuration, sending quota and delivery status cannot be
determined from repository files.

Source: `web/src/components/AuthForm.tsx`, `web/src/components/ResetPasswordForm.tsx`,
`docs/SETUP.md`, `docs/guvenlik-kurulum.md`, `supabase/email-templates/`.
