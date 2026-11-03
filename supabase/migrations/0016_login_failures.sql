-- Failed password sign-ins, kept by the server (service role) so a wrong-password lock holds for every browser,
-- not only the one that guessed. Emails and addresses are stored as keyed hashes, never in clear text.
-- Rows older than a day are deleted by the sign-in route itself.
create table if not exists login_failures (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists login_failures_email_idx on login_failures (email_hash, created_at desc);
create index if not exists login_failures_ip_idx on login_failures (ip_hash, created_at desc);

alter table login_failures enable row level security;
-- No policy on purpose: only the service role (which skips row level security) can read or write it.
revoke all on login_failures from anon, authenticated;
