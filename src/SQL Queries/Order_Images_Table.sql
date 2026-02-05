-- Order images table for per-order craft photos
create table if not exists public.order_images (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists order_images_order_id_idx on public.order_images(order_id);

alter table public.order_images enable row level security;

-- Public read access (needed for website "How it's made" page)
drop policy if exists "Public can read order images" on public.order_images;
create policy "Public can read order images"
  on public.order_images for select
  using (true);

-- Allow inserts from admin app (uses anon key)
drop policy if exists "Public can insert order images" on public.order_images;
create policy "Public can insert order images"
  on public.order_images for insert
  with check (true);

-- Allow deletes/updates from admin app if needed
drop policy if exists "Public can update order images" on public.order_images;
create policy "Public can update order images"
  on public.order_images for update
  using (true)
  with check (true);

drop policy if exists "Public can delete order images" on public.order_images;
create policy "Public can delete order images"
  on public.order_images for delete
  using (true);
