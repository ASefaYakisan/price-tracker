-- A secret per alert so the browser that created it can edit or delete it later
-- without accounts. Only the server (service role) reads or checks it.
alter table alerts add column if not exists manage_token uuid not null default gen_random_uuid();
