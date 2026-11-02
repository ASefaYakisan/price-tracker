-- Pasted links belong to the people who have them in their list (user_products, migration 0010).
-- Until now products and price_history were readable by everyone, so another person's link and the id of the account
-- that added it could be read with the public key. Shared items (every source except 'custom') stay public.
drop policy if exists "public read products" on products;
create policy "read shared and own products" on products for select to anon, authenticated
  using (
    source <> 'custom'
    or exists (select 1 from user_products u where u.product_id = products.id and u.user_id = (select auth.uid()))
  );

-- price_history follows the product: the subquery runs under the policy above.
drop policy if exists "public read history" on price_history;
create policy "read history of visible products" on price_history for select to anon, authenticated
  using (exists (select 1 from products p where p.id = price_history.product_id));

-- Nobody reads who added a link from the browser. The server (service role) still does.
-- A column list replaces the table-wide grant; a column added later needs its own grant to be readable.
revoke select on products from anon, authenticated;
grant select (id, source, external_id, title, url, image_url, currency, rating, created_at, last_seen_at, status, last_error, last_checked_at)
  on products to anon, authenticated;
