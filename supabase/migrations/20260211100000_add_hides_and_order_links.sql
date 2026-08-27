-- Hides domain tables and links to purchase/sales orders

create table if not exists public.hides (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  hide_name text not null,
  is_available boolean not null default true,
  sq_feet numeric(10, 2) not null check (sq_feet >= 0),
  supplier_id uuid references public.suppliers(id) on delete set null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  hide_type text not null check (hide_type in ('Full grain', 'Top Grain', 'Low Grade')),
  finishing text not null check (finishing in ('Full Veg tan', 'Semi Veg Tan', 'Oil', 'Oil pullup', 'Oil wax', 'crazy horse')),
  man_hours numeric(10, 2) not null default 0 check (man_hours >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hide_images (
  id uuid primary key default gen_random_uuid(),
  hide_id uuid not null references public.hides(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_order_hides (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  hide_id uuid not null references public.hides(id) on delete cascade,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (purchase_order_id, hide_id)
);

create table if not exists public.sales_order_hides (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  hide_id uuid not null references public.hides(id) on delete cascade,
  product_id uuid references public.inventory_items(id) on delete set null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  man_hours numeric(10, 2) not null default 0 check (man_hours >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (sales_order_id, hide_id, product_id)
);

create index if not exists idx_hides_supplier_id on public.hides(supplier_id);
create index if not exists idx_hides_business_id on public.hides(business_id);
create index if not exists idx_hides_created_at on public.hides(created_at desc);
create index if not exists idx_hide_images_hide_id on public.hide_images(hide_id);
create index if not exists idx_purchase_order_hides_po on public.purchase_order_hides(purchase_order_id);
create index if not exists idx_purchase_order_hides_hide on public.purchase_order_hides(hide_id);
create index if not exists idx_sales_order_hides_so on public.sales_order_hides(sales_order_id);
create index if not exists idx_sales_order_hides_hide on public.sales_order_hides(hide_id);
create index if not exists idx_sales_order_hides_product on public.sales_order_hides(product_id);

create or replace function public.set_updated_at_hides()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_hides_set_updated_at on public.hides;
create trigger trg_hides_set_updated_at
before update on public.hides
for each row
execute function public.set_updated_at_hides();
