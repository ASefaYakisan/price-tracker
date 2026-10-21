-- Each person keeps their own list. Two people can follow the same link; one leaving does not touch the other's
-- item, history or alerts. products.added_by stays as "who brought this link in" for the scraper's logs.
create table if not exists user_products (
  user_id     uuid not null references auth.users (id) on delete cascade,
  product_id  bigint not null references products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists user_products_product on user_products (product_id);

alter table user_products enable row level security;

create policy "users read own list" on user_products for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users add to own list" on user_products for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users remove from own list" on user_products for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Everyone who added a link so far finds it in their list.
insert into user_products (user_id, product_id, created_at)
select added_by, id, created_at from products where added_by is not null
on conflict do nothing;
