-- Products tracked across sources, plus one price row per scrape.
create table if not exists products (
  id            bigint generated always as identity primary key,
  source        text not null,
  external_id   text not null,
  title         text not null,
  url           text not null,
  image_url     text,
  currency      text,
  rating        smallint,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (source, external_id)
);

create table if not exists price_history (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references products(id) on delete cascade,
  price       numeric(12, 2),
  in_stock    boolean not null default true,
  scraped_at  timestamptz not null default now()
);
create index if not exists price_history_product_time on price_history (product_id, scraped_at desc);

-- Price-drop alerts: notify email when the price falls to or below target.
create table if not exists alerts (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references products(id) on delete cascade,
  email         text not null,
  target_price  numeric(12, 2) not null,
  last_sent_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists alerts_product on alerts (product_id);

-- Latest price and change versus the previous scrape, for the dashboard list.
create or replace view product_latest with (security_invoker = true) as
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

-- Public read-only dashboard; writes only through the service role (scraper).
alter table products enable row level security;
alter table price_history enable row level security;
alter table alerts enable row level security;
create policy "public read products" on products for select to anon, authenticated using (true);
create policy "public read history" on price_history for select to anon, authenticated using (true);
