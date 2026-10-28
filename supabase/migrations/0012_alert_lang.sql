-- The site language the alert was created in, so the price-drop email can be written in it.
-- Null (older alerts) means English.
alter table alerts add column if not exists lang text check (lang ~ '^[a-z]{2,3}$');
