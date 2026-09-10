alter table public.orders
  add column if not exists is_archived boolean not null default false;

create index if not exists idx_orders_is_archived on public.orders (is_archived);
