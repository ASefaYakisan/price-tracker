-- Links added from the site remember who added them, so that person (and only them) can stop tracking it.
alter table products add column if not exists added_by uuid references auth.users(id) on delete set null;
create index if not exists products_added_by on products(added_by);
