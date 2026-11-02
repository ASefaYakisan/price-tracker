-- Which way the target is crossed: 'below' = at or below it (price drops), 'above' = at or above it (price rises).
-- Existing alerts keep the old behaviour. The site and the scraper work without this column, in 'below' mode only.
alter table alerts add column if not exists direction text not null default 'below' check (direction in ('below', 'above'));
