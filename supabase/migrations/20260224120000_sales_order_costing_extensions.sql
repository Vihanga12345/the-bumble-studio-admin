-- Sales order costing extensions:
-- 1) Persist engraving/change/profit fields on sales_orders
-- 2) Add default crafter profit margin setting
-- 3) Update hide cost-per-piece formula for hides page

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS engraving_covered_amount numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS engraving_change_income numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS packing_cost numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS profit_margin_percentage numeric(12,2) NOT NULL DEFAULT 150;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS favourable_selling_price numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS extra_profit_or_loss numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.crafter_settings
  ADD COLUMN IF NOT EXISTS profit_margin_percentage numeric(12,2) NOT NULL DEFAULT 150;

CREATE OR REPLACE FUNCTION public.calculate_hide_cost_per_product()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Required formula:
  -- price_per_piece = hide_price * (2 * 0.67134509269) / hide_size_sqft
  NEW.cost_per_product := ROUND(
    (
      COALESCE(NEW.price, 0)::numeric * (2 * 0.67134509269)::numeric
    ) / GREATEST(COALESCE(NEW.sq_feet, 0)::numeric, 1::numeric),
    2
  );

  IF NEW.estimated_products_to_be_made IS NULL OR NEW.estimated_products_to_be_made <= 0 THEN
    NEW.estimated_products_to_be_made := 1;
  END IF;

  RETURN NEW;
END;
$$;
