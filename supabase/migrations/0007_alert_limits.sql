-- Alerts need an account now (the site asks guests to sign in), so the direct insert door for guests is closed too:
-- without this anyone could add alerts for any address straight through the public API key.
alter policy "guests create alerts" on alerts with check (false);

-- Limits per account, checked in the database so they also hold for requests that skip the site.
create or replace function public.check_alert_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null then
    return new;
  end if;
  if (select count(*) from public.alerts where user_id = new.user_id) >= 50 then
    raise exception 'alert_limit_total' using errcode = 'P0001';
  end if;
  if (select count(*) from public.alerts
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'alert_limit_hourly' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_alert_limits() from public, anon, authenticated;

create trigger alerts_limits
  before insert on alerts
  for each row execute function public.check_alert_limits();
