-- Crafter details module:
-- 1) Central hourly-rate setting
-- 2) Monthly withdrawal tracking on sales_order_hides
-- 3) Atomic monthly withdrawal function + finance expense entry

CREATE TABLE IF NOT EXISTS public.crafter_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  hourly_rate numeric(12,2) NOT NULL DEFAULT 200 CHECK (hourly_rate >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.crafter_settings (id, hourly_rate)
VALUES (true, 200)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_crafter_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crafter_settings_updated_at ON public.crafter_settings;
CREATE TRIGGER trg_crafter_settings_updated_at
BEFORE UPDATE ON public.crafter_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_crafter_settings_updated_at();

ALTER TABLE public.sales_order_hides
  ADD COLUMN IF NOT EXISTS crafter_fee_withdrawn boolean NOT NULL DEFAULT false;

ALTER TABLE public.sales_order_hides
  ADD COLUMN IF NOT EXISTS crafter_fee_withdrawn_month text;

ALTER TABLE public.sales_order_hides
  ADD COLUMN IF NOT EXISTS crafter_fee_withdrawn_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_sales_order_hides_crafter_withdrawn
  ON public.sales_order_hides (crafter_fee_withdrawn, crafter_fee_withdrawn_month);

CREATE OR REPLACE FUNCTION public.set_sales_order_hourly_fee_from_crafter_settings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_hourly_rate numeric(12,2);
BEGIN
  IF NEW.hourly_fee IS NULL THEN
    SELECT cs.hourly_rate
    INTO v_hourly_rate
    FROM public.crafter_settings cs
    WHERE cs.id = true;

    NEW.hourly_fee := COALESCE(v_hourly_rate, 200);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_orders_set_hourly_fee_from_crafter_settings ON public.sales_orders;
CREATE TRIGGER trg_sales_orders_set_hourly_fee_from_crafter_settings
BEFORE INSERT OR UPDATE OF hourly_fee
ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_sales_order_hourly_fee_from_crafter_settings();

CREATE OR REPLACE FUNCTION public.withdraw_crafter_fee_for_month(p_withdrawal_month text)
RETURNS TABLE (
  withdrawal_month text,
  total_hours numeric(12,2),
  hourly_rate numeric(12,2),
  total_fee numeric(12,2),
  affected_lines integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start date;
  v_month_end date;
  v_total_hours numeric(12,2);
  v_hourly_rate numeric(12,2);
  v_total_fee numeric(12,2);
  v_affected_lines integer;
BEGIN
  BEGIN
    v_month_start := to_date(p_withdrawal_month || '-01', 'YYYY-MM-DD');
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid month format. Use YYYY-MM.';
  END;

  IF to_char(v_month_start, 'YYYY-MM') <> p_withdrawal_month THEN
    RAISE EXCEPTION 'Invalid month value. Use YYYY-MM.';
  END IF;

  v_month_end := (v_month_start + INTERVAL '1 month')::date;

  IF EXISTS (
    SELECT 1
    FROM public.financial_transactions ft
    WHERE ft.type = 'expense'
      AND ft.category = 'Crafter Fee'
      AND ft.reference_number = p_withdrawal_month
  ) THEN
    RAISE EXCEPTION 'Crafter fee already withdrawn for %.', p_withdrawal_month;
  END IF;

  SELECT COALESCE(cs.hourly_rate, 200)::numeric(12,2)
  INTO v_hourly_rate
  FROM public.crafter_settings cs
  WHERE cs.id = true;

  SELECT
    COALESCE(SUM(COALESCE(soh.man_hours, 0)), 0)::numeric(12,2),
    COUNT(*)::integer
  INTO v_total_hours, v_affected_lines
  FROM public.sales_order_hides soh
  INNER JOIN public.sales_orders so ON so.id = soh.sales_order_id
  WHERE so.order_date >= v_month_start
    AND so.order_date < v_month_end
    AND COALESCE(soh.man_hours, 0) > 0
    AND COALESCE(soh.crafter_fee_withdrawn, false) = false;

  IF v_affected_lines = 0 THEN
    RAISE EXCEPTION 'No eligible crafter entries found for %.', p_withdrawal_month;
  END IF;

  v_total_fee := ROUND(v_total_hours * v_hourly_rate, 2);

  UPDATE public.sales_order_hides soh
  SET
    crafter_fee_withdrawn = true,
    crafter_fee_withdrawn_month = p_withdrawal_month,
    crafter_fee_withdrawn_at = now()
  FROM public.sales_orders so
  WHERE soh.sales_order_id = so.id
    AND so.order_date >= v_month_start
    AND so.order_date < v_month_end
    AND COALESCE(soh.man_hours, 0) > 0
    AND COALESCE(soh.crafter_fee_withdrawn, false) = false;

  INSERT INTO public.financial_transactions (
    type,
    amount,
    category,
    description,
    date,
    payment_method,
    reference_number
  )
  VALUES (
    'expense',
    v_total_fee,
    'Crafter Fee',
    'Crafter Fee - ' || p_withdrawal_month,
    now(),
    'bank',
    p_withdrawal_month
  );

  RETURN QUERY
  SELECT
    p_withdrawal_month,
    v_total_hours,
    v_hourly_rate,
    v_total_fee,
    v_affected_lines;
END;
$$;

