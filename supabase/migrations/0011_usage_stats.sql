-- Aggregate usage numbers for the owner's /api/admin/stats endpoint and for showing a buyer.
-- Only counts: no emails, links or user ids leave the database. Callable by the service role alone.
create or replace function usage_stats()
returns jsonb
language sql
security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'users',               (select count(*) from auth.users),
    'products',            (select count(*) from products),
    'pasted_links',        (select count(*) from products where source = 'custom'),
    'list_items',          (select count(*) from user_products),
    'alerts',              (select count(*) from alerts),
    'alerts_sent',         (select count(*) from alerts where last_sent_at is not null),
    'prices_last_24h',     (select count(*) from price_history where scraped_at > now() - interval '24 hours'),
    'prices_total',        (select count(*) from price_history),
    'link_reads_7d',       (select count(*) from track_attempts where created_at > now() - interval '7 days'),
    'link_reads_ok_7d',    (select count(*) from track_attempts where created_at > now() - interval '7 days' and outcome = 'ok')
  );
$$;

revoke all on function usage_stats() from public, anon, authenticated;
grant execute on function usage_stats() to service_role;
