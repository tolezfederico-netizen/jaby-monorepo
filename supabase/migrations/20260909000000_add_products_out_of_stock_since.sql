alter table public.products
  add column if not exists out_of_stock_since timestamptz;

-- Existing out-of-stock products have no historical transition timestamp, so
-- their tracking begins when this migration is applied.
update public.products
set out_of_stock_since = case
  when is_out_of_stock then now()
  else null
end;

create or replace function public.set_products_out_of_stock_since()
returns trigger
language plpgsql
as $$
begin
  if old.is_out_of_stock is distinct from new.is_out_of_stock then
    if new.is_out_of_stock then
      new.out_of_stock_since := now();
    else
      new.out_of_stock_since := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists products_set_out_of_stock_since on public.products;

create trigger products_set_out_of_stock_since
before update on public.products
for each row
execute function public.set_products_out_of_stock_since();
