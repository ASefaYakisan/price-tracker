-- A signed-in account may only create or change alerts for its own email address, so the site's mail
-- can not be aimed at third parties. Checked in the database so requests that skip the site are covered too.
-- The service role (scraper, server code) is not affected, and existing rows are left as they are.
create or replace function public.check_alert_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null or coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;
  if lower(new.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'alert_email_not_owner' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_alert_email() from public, anon, authenticated;

create trigger alerts_email_own
  before insert or update of email on alerts
  for each row execute function public.check_alert_email();
