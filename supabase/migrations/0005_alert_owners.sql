-- Signed-in users own their alerts. Guests keep creating alerts without an owner
-- (managed through the per-alert token); signed-in users read and change only their own rows.
alter table alerts add column if not exists user_id uuid references auth.users (id) on delete cascade;
create index if not exists alerts_user on alerts (user_id);

create policy "guests create alerts" on alerts for insert to anon
  with check (last_sent_at is null and user_id is null);

-- The old insert policy covered both roles; narrow it to signed-in users creating their own rows.
alter policy "public create alerts" on alerts to authenticated
  with check (last_sent_at is null and (select auth.uid()) = user_id);
alter policy "public create alerts" on alerts rename to "users create own alerts";

create policy "users read own alerts" on alerts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users update own alerts" on alerts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users delete own alerts" on alerts for delete to authenticated
  using ((select auth.uid()) = user_id);
