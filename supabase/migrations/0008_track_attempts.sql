-- One row per attempt to read a pasted link (when it is added and on every daily refresh),
-- so we can see which shops fail and why before deciding what to build next.
create table if not exists track_attempts (
  id           bigint generated always as identity primary key,
  url          text not null,
  host         text not null,
  user_id      uuid references auth.users(id) on delete set null,
  stage        text not null check (stage in ('add', 'daily')),
  outcome      text not null check (outcome in ('ok', 'http_error', 'no_price', 'timeout', 'network')),
  http_status  smallint,
  layer        text,
  created_at   timestamptz not null default now()
);
create index if not exists track_attempts_host_time on track_attempts (host, created_at desc);

-- No policies on purpose: only the service role (site server and scraper) reads and writes, and it skips RLS.
alter table track_attempts enable row level security;
