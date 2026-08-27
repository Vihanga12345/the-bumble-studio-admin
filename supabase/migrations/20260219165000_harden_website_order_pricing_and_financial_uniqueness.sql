-- Security hardening:
-- 1) Ensure one sales income transaction per order reference
-- 2) Enforce authoritative website order item pricing + stock checks

-- Cleanup potential duplicate automatic sales-income transactions (keep newest)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY reference_number, category, type
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.financial_transactions
  WHERE category = 'sales'
    AND type = 'income'
    AND reference_number IS NOT NULL
)
DELETE FROM public.financial_transactions ft
USING ranked r
WHERE ft.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_transactions_sales_income_ref
  ON public.financial_transactions(reference_number, category, type)
  WHERE category = 'sales' AND type = 'income' AND reference_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_orders_business_order_number
  ON public.sales_orders(business_id, order_number);

CREATE OR REPLACE FUNCTION public.enforce_website_sales_order_item_pricing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_source text;
  v_product_id uuid;
  v_is_active boolean;
  v_stock numeric;
  v_selling_price numeric;
BEGIN
  SELECT so.order_source
  INTO v_order_source
  FROM public.sales_orders so
  WHERE so.id = NEW.sales_order_id;

  IF COALESCE(v_order_source, '') <> 'website' THEN
    RETURN NEW;
  END IF;

  v_product_id := COALESCE(
    NULLIF(to_jsonb(NEW)->>'product_id', '')::uuid,
    NULLIF(to_jsonb(NEW)->>'inventory_item_id', '')::uuid,
    NULLIF(to_jsonb(NEW)->>'item_id', '')::uuid
  );

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Website order item must include a valid product_id';
  END IF;

  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Website order item quantity must be greater than zero';
  END IF;

  SELECT i.is_active, i.current_stock, COALESCE(i.sale_price, i.selling_price)
  INTO v_is_active, v_stock, v_selling_price
  FROM public.inventory_items i
  WHERE i.id = v_product_id;

  IF v_selling_price IS NULL OR v_is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Website order item product is unavailable';
  END IF;

  IF COALESCE(v_stock, 0) < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for selected website product';
  END IF;

  NEW.unit_price := ROUND(v_selling_price::numeric, 2);
  NEW.discount := 0;
  NEW.total_price := ROUND(COALESCE(NEW.quantity, 0)::numeric * COALESCE(NEW.unit_price, 0)::numeric, 2);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_website_sales_order_item_pricing ON public.sales_order_items;
CREATE TRIGGER trg_enforce_website_sales_order_item_pricing
BEFORE INSERT OR UPDATE OF quantity, unit_price, discount, total_price
ON public.sales_order_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_website_sales_order_item_pricing();

CREATE OR REPLACE FUNCTION public.calculate_sales_order_hide_line_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_hide_cost_per_product numeric(12,2);
  v_order_source text;
BEGIN
  SELECT so.order_source
  INTO v_order_source
  FROM public.sales_orders so
  WHERE so.id = NEW.sales_order_id;

  IF NEW.hide_id IS NOT NULL THEN
    SELECT h.cost_per_product INTO v_hide_cost_per_product
    FROM public.hides h
    WHERE h.id = NEW.hide_id;
  END IF;

  -- For website orders, always enforce DB hide cost.
  IF COALESCE(v_order_source, '') = 'website' THEN
    NEW.unit_cost_per_product := COALESCE(v_hide_cost_per_product, 0);
  ELSIF NEW.hide_id IS NOT NULL AND (NEW.unit_cost_per_product IS NULL OR NEW.unit_cost_per_product <= 0) THEN
    NEW.unit_cost_per_product := COALESCE(v_hide_cost_per_product, 0);
  END IF;

  NEW.line_total := ROUND(COALESCE(NEW.quantity, 0)::numeric * COALESCE(NEW.unit_cost_per_product, 0)::numeric, 2);
  RETURN NEW;
END;
$$;

