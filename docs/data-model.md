# Data model

This describes the final schema defined by migrations 0001–0015 in
[`supabase/migrations/`](../supabase/migrations/), read in order. It does not
establish which migrations have been applied to any live database.
Migration numbers below refer to filenames in that directory.

`NN` means NOT NULL; other columns are nullable. All timestamps are
`timestamptz`. Identity IDs use `generated always as identity`.

## Tables

### products

One product per source/external identifier; created in 0001.

| Column | Final type / default | Meaning / introduced |
| --- | --- | --- |
| id | bigint, identity, primary key | Product ID; 0001 |
| source | text, NN | Source identifier; 0001 |
| external_id | text, NN | Source-specific identifier; 0001 |
| title | text, NN | Product title; 0001 |
| url | text, NN | Product/source URL; 0001 |
| image_url | text | Image URL; 0001 |
| currency | text | Currency label; 0001 |
| rating | smallint | Rating; scale unclear from migrations; 0001 |
| created_at | timestamptz, NN, now() | Creation time; 0001 |
| last_seen_at | timestamptz, NN, now() | Last observation time; 0001 |
| added_by | uuid | Original adding account; 0006 |
| status | text, NN, 'active' | pending / active / failed; 0009 |
| last_error | text | Last failure code; 0009 |
| last_checked_at | timestamptz | Last check time; 0009 |
| failed_checks | smallint, NN, 0 | Failed-read count; 0009 |

Constraints/indexes: primary key `id` and unique `(source, external_id)` (0001);
`added_by` references `auth.users(id)` with ON DELETE SET NULL and has index
`products_added_by` (0006); status CHECK permits only the three listed values
(0009). There is no failure-count range CHECK in these migrations.

### price_history

One observation of a product's price/availability; created in 0001.

| Column | Final type / default | Meaning / introduced |
| --- | --- | --- |
| id | bigint, identity, primary key | Observation ID; 0001 |
| product_id | bigint, NN | Product reference; 0001 |
| price | numeric(20,8) | Observed price; 0001, widened in 0002 |
| in_stock | boolean, NN, true | Availability; 0001 |
| scraped_at | timestamptz, NN, now() | Observation time; 0001 |

`product_id` references `products(id)` ON DELETE CASCADE. Index
`price_history_product_time` covers `(product_id, scraped_at DESC)` (0001).
No uniqueness constraint limits observations per product or timestamp.

### alerts

An email target for a product; created in 0001.

| Column | Final type / default | Meaning / introduced |
| --- | --- | --- |
| id | bigint, identity, primary key | Alert ID; 0001 |
| product_id | bigint, NN | Product reference; 0001 |
| email | text, NN | Recipient address; 0001 |
| target_price | numeric(20,8), NN | Positive target; 0001, widened in 0002 |
| last_sent_at | timestamptz | Sent marker; NULL means open; 0001 |
| created_at | timestamptz, NN, now() | Creation time; 0001 |
| manage_token | uuid, NN, gen_random_uuid() | Per-alert management token; 0004 |
| user_id | uuid | Owning account; 0005 |
| lang | text | 2–3 lowercase letters, or NULL for older alerts; 0012 |
| direction | text, NN, 'below' | below / above; 0015 |

Foreign keys: `product_id → products(id)` and `user_id → auth.users(id)`, both
ON DELETE CASCADE. Indexes: `alerts_product` (0001), `alerts_user` (0005).
Migration 0003 adds a basic email-format CHECK with length ≤254, a target >0
CHECK, and `alerts_one_open`, unique on `(product_id, lower(email))` only
where `last_sent_at IS NULL`. This uniqueness does not include owner or direction.
Migration 0012 checks the language shape, not membership of the application's
language list. Migration 0015 restricts direction to `below`/`above`.

### track_attempts

Read-attempt diagnostics; created in 0008.

| Column | Type / default | Meaning |
| --- | --- | --- |
| id | bigint, identity, primary key | Attempt ID |
| url | text, NN | Attempted URL |
| host | text, NN | Host used for grouping |
| user_id | uuid | Associated account |
| stage | text, NN | CHECK: add / daily |
| outcome | text, NN | CHECK: ok / http_error / no_price / timeout / network |
| http_status | smallint | HTTP response status |
| layer | text | Reading layer label |
| created_at | timestamptz, NN, now() | Attempt time |

`user_id` references `auth.users(id)` ON DELETE SET NULL. Index
`track_attempts_host_time` covers `(host, created_at DESC)` (0008).
There is no product foreign key and no retention job defined by these migrations.

### user_products

Each account's personal product list; all columns introduced in 0010.

| Column | Type / default | Meaning |
| --- | --- | --- |
| user_id | uuid, NN | Account reference |
| product_id | bigint, NN | Product reference |
| created_at | timestamptz, NN, now() | List-entry time |

Composite primary key `(user_id, product_id)` prevents duplicate membership.
Both foreign keys use ON DELETE CASCADE; index `user_products_product` covers
`product_id`. Migration 0010 backfills membership from non-null `products.added_by`.

## Relationships

- `auth.users` → alerts and user_products: deleting the account cascades to its rows.
- `auth.users` → products.added_by and track_attempts.user_id: deletion clears the reference.
- products → price_history, alerts and user_products: deleting a product cascades to those rows.
- user_products links many accounts to many products; `added_by` records the original adder,
  not every current list member.

`auth.users` is referenced, not created here; its full schema is unclear from migrations.

## Access rules

RLS is enabled on products, price_history and alerts (0001), track_attempts
(0008), and user_products (0010). The final policy state is:

| Table | Anonymous role | Authenticated role |
| --- | --- | --- |
| products | SELECT shared sources (`source <> 'custom'`) | SELECT shared sources or custom products in the caller's user_products list |
| price_history | SELECT history of visible products | SELECT history of visible products |
| alerts | No permitted operations; guest INSERT policy has CHECK false | SELECT/UPDATE/DELETE own user_id; INSERT own user_id with last_sent_at NULL |
| track_attempts | No policies permitting access | No policies permitting access |
| user_products | No policies permitting access | SELECT/INSERT/DELETE own user_id; no UPDATE policy |

No products/history write policies are added for these two browser roles.
The old public product/history policies are dropped in 0013; the alert insert
policy from 0003 is narrowed and renamed in 0005, and guest insertion is disabled
in 0007. Authenticated alert UPDATE requires the row to remain owned by the caller.

Migration 0013 also revokes table-wide SELECT on products for anon/authenticated
and grants only `id, source, external_id, title, url, image_url, currency, rating,
created_at, last_seen_at, status, last_error, last_checked_at`. Neither `added_by`
nor `failed_checks` is in that list. RLS policies alone do not grant SQL privileges;
other initial role/table grants are unclear from migrations.

The service role is described as bypassing RLS (explicitly in 0008), for server
and scraper reads/writes. It must remain server-side. Triggers below can still
apply to service-role writes; bypassing RLS does not bypass every constraint.

### Alert triggers

- `alerts_limits` BEFORE INSERT calls `public.check_alert_limits()` (0007).
  NULL owners skip the checks; other inserts raise `alert_limit_total` at 50
  existing alerts or `alert_limit_hourly` at 20 created in the preceding hour.
  This counts all matching rows, not only open alerts. No UPDATE limit trigger exists.
- `alerts_email_own` BEFORE INSERT OR UPDATE OF email calls
  `public.check_alert_email()` (0014). For non-null owners and an authenticated
  JWT role, email must match the JWT email case-insensitively, otherwise it raises
  `alert_email_not_owner`. Other roles and NULL owners skip this check; it does
  not revise existing rows.

Both functions are SECURITY DEFINER with an empty search_path; direct EXECUTE
is revoked from public, anon and authenticated. They are invoked by their triggers.

## Views and functions

### product_latest

Created in 0001, recreated for precision in 0002, and replaced in 0009 with
SECURITY INVOKER. Its final columns are the ten original product columns
(`id` through `last_seen_at`), then `price, in_stock, scraped_at, previous_price,
price_change, status, last_error, last_checked_at`. It excludes `added_by` and
`failed_checks`. Lateral queries take the newest history row and the preceding
row by `scraped_at DESC`; price_change is their difference. LEFT JOIN preserves
products without history. Equal-timestamp tie order is not specified.
Invoker security subjects reads to the caller's underlying permissions/policies.

### usage_stats()

Migration 0011 creates a SQL SECURITY DEFINER function returning JSONB, with
search_path `public, auth`. EXECUTE is revoked from public/anon/authenticated and
granted to service_role. Its aggregate keys are `users`, `products`, `pasted_links`,
`list_items`, `alerts`, `alerts_sent`, `prices_last_24h`, `prices_total`,
`link_reads_7d`, `link_reads_ok_7d`. It returns counts, not row-level user data.
The two alert trigger functions are described above.
