-- Remove stock check from website order item trigger.
-- Products are made-to-order so stock levels are irrelevant.

CREATE OR REPLACE FUNCTION public.enforce_website_sales_order_item_pricing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_source text;
  v_product_id uuid;
  v_is_active boolean;
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

  SELECT i.is_active, COALESCE(i.sale_price, i.selling_price)
  INTO v_is_active, v_selling_price
  FROM public.inventory_items i
  WHERE i.id = v_product_id;

  IF v_selling_price IS NULL OR v_is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Website order item product is unavailable';
  END IF;

  -- Stock check intentionally removed: all products are made-to-order.

  NEW.unit_price := ROUND(v_selling_price::numeric, 2);
  NEW.discount := 0;
  NEW.total_price := ROUND(COALESCE(NEW.quantity, 0)::numeric * COALESCE(NEW.unit_price, 0)::numeric, 2);

  RETURN NEW;
END;
$$;
