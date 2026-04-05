-- Fix withdraw_crafter_fee_for_month to include business_id in the financial_transactions insert
-- so the expense record appears correctly in the finance/cashflow module.

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
  v_business_id uuid := '550e8400-e29b-41d4-a716-446655440000';
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

  -- Prevent double-withdrawal for the same month
  IF EXISTS (
    SELECT 1
    FROM public.financial_transactions ft
    WHERE ft.type = 'expense'
      AND ft.category = 'Crafter Fee'
      AND ft.reference_number = p_withdrawal_month
  ) THEN
    RAISE EXCEPTION 'Crafter fee already withdrawn for %.', p_withdrawal_month;
  END IF;

  -- Get current hourly rate
  SELECT COALESCE(cs.hourly_rate, 200)::numeric(12,2)
  INTO v_hourly_rate
  FROM public.crafter_settings cs
  WHERE cs.id = true;

  -- Sum eligible (non-withdrawn) man_hours for the month
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

  -- Mark all eligible hide lines as withdrawn
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

  -- Record expense in the finance module
  INSERT INTO public.financial_transactions (
    business_id,
    type,
    amount,
    category,
    description,
    date,
    payment_method,
    reference_number
  )
  VALUES (
    v_business_id,
    'expense',
    v_total_fee,
    'Crafter Fee',
    'Crafter Fee Withdrawal — ' || to_char(v_month_start, 'Month YYYY'),
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
