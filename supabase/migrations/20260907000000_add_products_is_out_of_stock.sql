alter table public.products
  add column if not exists is_out_of_stock boolean not null default false;
