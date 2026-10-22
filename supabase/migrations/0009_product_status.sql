-- Whether a pasted link is being read, so the site can say "pending", "tracking" or "could not read" and why.
-- pending: no price yet, the 15-minute job keeps trying (scraper/src/pending.js); failed: it gave up after 3 tries,
-- the daily refresh still tries once a day and the owner can press "Try again"; active: everything else.
alter table products
  add column if not exists status text not null default 'active' check (status in ('pending', 'active', 'failed')),
  add column if not exists last_error text,       -- outcome of the last failed read, e.g. 'http_error:403', 'no_price'
  add column if not exists last_checked_at timestamptz,
  add column if not exists failed_checks smallint not null default 0;

update products p set status = 'pending'
where source = 'custom' and not exists (select 1 from price_history h where h.product_id = p.id);

-- Same view as 0002 with the new columns appended (create or replace only allows adding columns at the end).
-- p.* is spelled out because the view was created before products.added_by and must keep its column order.
create or replace view product_latest with (security_invoker = true) as
select p.id, p.source, p.external_id, p.title, p.url, p.image_url, p.currency, p.rating, p.created_at, p.last_seen_at,
       cur.price, cur.in_stock, cur.scraped_at,
       prev.price as previous_price,
       cur.price - prev.price as price_change,
       p.status, p.last_error, p.last_checked_at
from products p
left join lateral (
  select price, in_stock, scraped_at from price_history h
  where h.product_id = p.id order by scraped_at desc limit 1
) cur on true
left join lateral (
  select price from price_history h
  where h.product_id = p.id order by scraped_at desc offset 1 limit 1
) prev on true;
