-- Crypto and exchange rates need more than 2 decimals (e.g. $0.00001234, ¥ in TRY).
drop view if exists product_latest;
alter table price_history alter column price type numeric(20, 8);
alter table alerts alter column target_price type numeric(20, 8);
create view product_latest with (security_invoker = true) as
select p.*, cur.price, cur.in_stock, cur.scraped_at,
       prev.price as previous_price,
       cur.price - prev.price as price_change
from products p
left join lateral (
  select price, in_stock, scraped_at from price_history h
  where h.product_id = p.id order by scraped_at desc limit 1
) cur on true
left join lateral (
  select price from price_history h
  where h.product_id = p.id order by scraped_at desc offset 1 limit 1
) prev on true;
