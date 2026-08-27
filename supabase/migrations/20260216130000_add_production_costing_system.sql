-- Production costing enhancements:
-- 1) Hide-level per-product cost defaults
-- 2) Sales-order labour costing
-- 3) Additional per-order crafting expense lines

-- -----------------------------------------------------
-- Hides: estimated products + cost per product
-- -----------------------------------------------------
ALTER TABLE public.hides
  ADD COLUMN IF NOT EXISTS estimated_products_to_be_made integer NOT NULL DEFAULT 1;

ALTER TABLE public.hides
  ADD COLUMN IF NOT EXISTS cost_per_product numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.hides
  DROP CONSTRAINT IF EXISTS hides_estimated_products_to_be_made_check;

ALTER TABLE public.hides
  ADD CONSTRAINT hides_estimated_products_to_be_made_check
  CHECK (estimated_products_to_be_made > 0);

CREATE OR REPLACE FUNCTION public.calculate_hide_cost_per_product()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estimated_products_to_be_made IS NULL OR NEW.estimated_products_to_be_made <= 0 THEN
    NEW.estimated_products_to_be_made := 1;
  END IF;

  NEW.cost_per_product := ROUND(
    COALESCE(NEW.price, 0)::numeric / NEW.estimated_products_to_be_made::numeric,
    2
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hides_calculate_cost_per_product ON public.hides;
CREATE TRIGGER trg_hides_calculate_cost_per_product
BEFORE INSERT OR UPDATE OF price, estimated_products_to_be_made
ON public.hides
FOR EACH ROW
EXECUTE FUNCTION public.calculate_hide_cost_per_product();

UPDATE public.hides
SET
  estimated_products_to_be_made = CASE
    WHEN estimated_products_to_be_made IS NULL OR estimated_products_to_be_made <= 0 THEN 1
    ELSE estimated_products_to_be_made
  END,
  cost_per_product = ROUND(
    COALESCE(price, 0)::numeric /
    CASE
      WHEN estimated_products_to_be_made IS NULL OR estimated_products_to_be_made <= 0 THEN 1
      ELSE estimated_products_to_be_made
    END::numeric,
    2
  );

-- -----------------------------------------------------
-- Sales-order hide links: defaultable per-product cost
-- -----------------------------------------------------
ALTER TABLE public.sales_order_hides
  ADD COLUMN IF NOT EXISTS unit_cost_per_product numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_order_hides
  ADD COLUMN IF NOT EXISTS line_total numeric(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.calculate_sales_order_hide_line_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_hide_cost_per_product numeric(12,2);
BEGIN
  IF NEW.hide_id IS NOT NULL AND (NEW.unit_cost_per_product IS NULL OR NEW.unit_cost_per_product <= 0) THEN
    SELECT h.cost_per_product INTO v_hide_cost_per_product
    FROM public.hides h
    WHERE h.id = NEW.hide_id;

    NEW.unit_cost_per_product := COALESCE(v_hide_cost_per_product, 0);
  END IF;

  NEW.line_total := ROUND(COALESCE(NEW.quantity, 0)::numeric * COALESCE(NEW.unit_cost_per_product, 0)::numeric, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_order_hides_calculate_line_totals ON public.sales_order_hides;
CREATE TRIGGER trg_sales_order_hides_calculate_line_totals
BEFORE INSERT OR UPDATE OF hide_id, quantity, unit_cost_per_product
ON public.sales_order_hides
FOR EACH ROW
EXECUTE FUNCTION public.calculate_sales_order_hide_line_totals();

UPDATE public.sales_order_hides soh
SET
  unit_cost_per_product = COALESCE(h.cost_per_product, 0),
  line_total = ROUND(COALESCE(soh.quantity, 0)::numeric * COALESCE(h.cost_per_product, 0)::numeric, 2)
FROM public.hides h
WHERE h.id = soh.hide_id
  AND (soh.unit_cost_per_product = 0 OR soh.line_total = 0);

-- -----------------------------------------------------
-- Sales orders: labour fields and production total
-- -----------------------------------------------------
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS number_of_hours numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS hourly_fee numeric(12,2) NOT NULL DEFAULT 200;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS crafter_labour_cost numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS production_cost_total numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_orders
  DROP CONSTRAINT IF EXISTS sales_orders_number_of_hours_check;

ALTER TABLE public.sales_orders
  ADD CONSTRAINT sales_orders_number_of_hours_check
  CHECK (number_of_hours >= 0);

ALTER TABLE public.sales_orders
  DROP CONSTRAINT IF EXISTS sales_orders_hourly_fee_check;

ALTER TABLE public.sales_orders
  ADD CONSTRAINT sales_orders_hourly_fee_check
  CHECK (hourly_fee >= 0);

CREATE OR REPLACE FUNCTION public.calculate_sales_order_labour_cost()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.crafter_labour_cost := ROUND(COALESCE(NEW.number_of_hours, 0)::numeric * COALESCE(NEW.hourly_fee, 0)::numeric, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_orders_calculate_labour_cost ON public.sales_orders;
CREATE TRIGGER trg_sales_orders_calculate_labour_cost
BEFORE INSERT OR UPDATE OF number_of_hours, hourly_fee
ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.calculate_sales_order_labour_cost();

UPDATE public.sales_orders
SET crafter_labour_cost = ROUND(COALESCE(number_of_hours, 0)::numeric * COALESCE(hourly_fee, 0)::numeric, 2)
WHERE crafter_labour_cost IS NULL OR crafter_labour_cost = 0;

-- -----------------------------------------------------
-- Additional order expenses (materials, custom, etc.)
-- -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'sales_order_cost_item_type'
  ) THEN
    CREATE TYPE public.sales_order_cost_item_type AS ENUM ('HIDE', 'MATERIAL', 'SELLING_ITEM', 'CUSTOM');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sales_order_cost_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_type public.sales_order_cost_item_type NOT NULL,
  hide_id uuid REFERENCES public.hides(id) ON DELETE SET NULL,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  is_editable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_order_cost_lines_order ON public.sales_order_cost_lines(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_cost_lines_item_type ON public.sales_order_cost_lines(item_type);
CREATE INDEX IF NOT EXISTS idx_sales_order_cost_lines_hide ON public.sales_order_cost_lines(hide_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_cost_lines_inventory_item ON public.sales_order_cost_lines(inventory_item_id);

CREATE OR REPLACE FUNCTION public.set_sales_order_cost_lines_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_order_cost_lines_set_updated_at ON public.sales_order_cost_lines;
CREATE TRIGGER trg_sales_order_cost_lines_set_updated_at
BEFORE UPDATE ON public.sales_order_cost_lines
FOR EACH ROW
EXECUTE FUNCTION public.set_sales_order_cost_lines_updated_at();

CREATE OR REPLACE FUNCTION public.calculate_sales_order_cost_line_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_hide_name text;
  v_hide_cost numeric(12,2);
  v_item_name text;
  v_purchase_cost numeric(12,2);
  v_selling_price numeric(12,2);
BEGIN
  IF NEW.item_type = 'HIDE'::public.sales_order_cost_item_type AND NEW.hide_id IS NOT NULL THEN
    SELECT h.hide_name, h.cost_per_product
    INTO v_hide_name, v_hide_cost
    FROM public.hides h
    WHERE h.id = NEW.hide_id;

    IF COALESCE(TRIM(NEW.description), '') = '' THEN
      NEW.description := COALESCE(v_hide_name, 'Hide');
    END IF;

    IF NEW.unit_cost IS NULL OR NEW.unit_cost <= 0 THEN
      NEW.unit_cost := COALESCE(v_hide_cost, 0);
    END IF;
  END IF;

  IF NEW.item_type = 'MATERIAL'::public.sales_order_cost_item_type AND NEW.inventory_item_id IS NOT NULL THEN
    SELECT i.name, i.purchase_cost
    INTO v_item_name, v_purchase_cost
    FROM public.inventory_items i
    WHERE i.id = NEW.inventory_item_id;

    IF COALESCE(TRIM(NEW.description), '') = '' THEN
      NEW.description := COALESCE(v_item_name, 'Material');
    END IF;

    IF NEW.unit_cost IS NULL OR NEW.unit_cost <= 0 THEN
      NEW.unit_cost := COALESCE(v_purchase_cost, 0);
    END IF;
  END IF;

  IF NEW.item_type = 'SELLING_ITEM'::public.sales_order_cost_item_type AND NEW.inventory_item_id IS NOT NULL THEN
    SELECT i.name, i.selling_price
    INTO v_item_name, v_selling_price
    FROM public.inventory_items i
    WHERE i.id = NEW.inventory_item_id;

    IF COALESCE(TRIM(NEW.description), '') = '' THEN
      NEW.description := COALESCE(v_item_name, 'Selling Item');
    END IF;

    IF NEW.unit_cost IS NULL OR NEW.unit_cost <= 0 THEN
      NEW.unit_cost := COALESCE(v_selling_price, 0);
    END IF;
  END IF;

  NEW.line_total := ROUND(COALESCE(NEW.quantity, 0)::numeric * COALESCE(NEW.unit_cost, 0)::numeric, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_order_cost_lines_calculate_defaults ON public.sales_order_cost_lines;
CREATE TRIGGER trg_sales_order_cost_lines_calculate_defaults
BEFORE INSERT OR UPDATE OF item_type, hide_id, inventory_item_id, description, quantity, unit_cost
ON public.sales_order_cost_lines
FOR EACH ROW
EXECUTE FUNCTION public.calculate_sales_order_cost_line_defaults();

-- -----------------------------------------------------
-- Aggregate production totals on sales_orders
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_sales_order_production_total(p_sales_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_hide_total numeric(12,2);
  v_cost_line_total numeric(12,2);
  v_labour_total numeric(12,2);
BEGIN
  SELECT COALESCE(SUM(line_total), 0)::numeric(12,2)
  INTO v_hide_total
  FROM public.sales_order_hides
  WHERE sales_order_id = p_sales_order_id;

  SELECT COALESCE(SUM(line_total), 0)::numeric(12,2)
  INTO v_cost_line_total
  FROM public.sales_order_cost_lines
  WHERE sales_order_id = p_sales_order_id;

  SELECT COALESCE(crafter_labour_cost, 0)::numeric(12,2)
  INTO v_labour_total
  FROM public.sales_orders
  WHERE id = p_sales_order_id;

  UPDATE public.sales_orders
  SET production_cost_total = ROUND(v_hide_total + v_cost_line_total + v_labour_total, 2)
  WHERE id = p_sales_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalculate_sales_order_production_from_hides()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalculate_sales_order_production_total(COALESCE(NEW.sales_order_id, OLD.sales_order_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_order_hides_recalculate_production_total ON public.sales_order_hides;
CREATE TRIGGER trg_sales_order_hides_recalculate_production_total
AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_hides
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_sales_order_production_from_hides();

CREATE OR REPLACE FUNCTION public.trg_recalculate_sales_order_production_from_cost_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalculate_sales_order_production_total(COALESCE(NEW.sales_order_id, OLD.sales_order_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_order_cost_lines_recalculate_production_total ON public.sales_order_cost_lines;
CREATE TRIGGER trg_sales_order_cost_lines_recalculate_production_total
AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_cost_lines
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_sales_order_production_from_cost_lines();

CREATE OR REPLACE FUNCTION public.trg_recalculate_sales_order_production_from_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalculate_sales_order_production_total(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_orders_recalculate_production_total ON public.sales_orders;
CREATE TRIGGER trg_sales_orders_recalculate_production_total
AFTER INSERT OR UPDATE OF number_of_hours, hourly_fee, crafter_labour_cost
ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_sales_order_production_from_order();
