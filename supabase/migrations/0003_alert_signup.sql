-- Visitors can sign up for a price alert from the product page, but never read alerts back.
-- The checks keep obviously bad rows out; the scraper (service role) sends and marks them.
alter table alerts
  add constraint alerts_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  add constraint alerts_target_positive check (target_price > 0);

-- One open alert per product and address, so repeat clicks do not queue duplicate emails.
create unique index if not exists alerts_one_open on alerts (product_id, lower(email)) where last_sent_at is null;

create policy "public create alerts" on alerts for insert to anon, authenticated
  with check (last_sent_at is null);
