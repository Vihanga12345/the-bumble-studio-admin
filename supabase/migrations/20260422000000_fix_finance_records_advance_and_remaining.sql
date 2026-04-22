-- =============================================================================
-- Fix: Finance records not created for Advance Paid / Remaining Amount Paid
-- =============================================================================
-- Root causes identified:
--
-- 1. calculate_sales_order_amounts (BEFORE trigger) was overriding total_amount
--    as (subtotal_amount - discount_amount), ignoring engraving costs and
--    delivery cost that the frontend includes. This caused the AFTER trigger
--    to use a wrong (or zero) total_amount when creating the finance record.
--
-- 2. The same BEFORE trigger was zeroing advance_payment_amount = 0 whenever
--    advance_payment_percentage = 0 (original version in 20260122045408).
--    ManualSalesOrder always sends advance_payment_percentage = 0 for manual
--    amounts, so the advance amount was wiped before the AFTER trigger fired.
--    The AFTER trigger (20260225170000) then saw amount <= 0 and returned
--    without creating any finance record.
--
-- Fix:
--   1. Remove total_amount recalculation from BEFORE trigger — the frontend
--      always sends the correct total_amount (including engraving + delivery).
--   2. Keep advance_payment_amount as-is when advance_payment_percentage = 0.
--   3. Rewrite handle_order_stock_and_finance to reliably create finance
--      records for both 'Advance Paid' and 'Full Payment Done' (Remaining
--      Amount Paid maps to Full Payment Done via deriveOrderStatusFromWorkflow).
-- =============================================================================

-- Ensure advance_payment_date / advance_amount / full_payment_date / full_amount
-- columns exist (added by 20260225150000 but guard for safety)
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS advance_payment_date  timestamptz,
  ADD COLUMN IF NOT EXISTS advance_amount         decimal(10,2),
  ADD COLUMN IF NOT EXISTS full_payment_date      timestamptz,
  ADD COLUMN IF NOT EXISTS full_amount            decimal(10,2);

-- =============================================================================
-- FIX 1 — BEFORE trigger: calculate_sales_order_amounts
-- =============================================================================
CREATE OR REPLACE FUNCTION public.calculate_sales_order_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate order-level discount amount from percentage when set
    IF COALESCE(NEW.discount_percentage, 0) > 0 THEN
        NEW.discount_amount := ROUND(
            (COALESCE(NEW.subtotal_amount, 0) * NEW.discount_percentage / 100),
            2
        );
    ELSE
        NEW.discount_amount := COALESCE(NEW.discount_amount, 0);
    END IF;

    -- Do NOT override total_amount.
    -- The frontend (ManualSalesOrder) sends the correct total_amount which
    -- already incorporates item discounts, the order discount, engraving
    -- costs, and delivery cost.  Recalculating from subtotal_amount alone
    -- would silently strip those components and produce a wrong amount in
    -- the finance record.

    -- Auto-calculate advance_payment_amount ONLY when a percentage is set.
    -- When percentage = 0 the caller is providing a manual amount — keep it.
    IF COALESCE(NEW.advance_payment_percentage, 0) > 0 THEN
        NEW.advance_payment_amount := ROUND(
            COALESCE(NEW.total_amount, 0) * NEW.advance_payment_percentage / 100,
            2
        );
    END IF;
    -- else: advance_payment_amount stays exactly as the caller provided

    -- Always recompute remaining_balance
    NEW.remaining_balance := GREATEST(
        ROUND(
            COALESCE(NEW.total_amount, 0) - COALESCE(NEW.advance_payment_amount, 0),
            2
        ),
        0
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the BEFORE trigger (idempotent)
DROP TRIGGER IF EXISTS trigger_calculate_sales_order_amounts ON public.sales_orders;
CREATE TRIGGER trigger_calculate_sales_order_amounts
    BEFORE INSERT OR UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_sales_order_amounts();

-- =============================================================================
-- FIX 2 — AFTER trigger: handle_order_stock_and_finance
-- =============================================================================
DROP TRIGGER IF EXISTS trigger_handle_order_stock_and_finance ON public.sales_orders;
DROP FUNCTION IF EXISTS handle_order_stock_and_finance() CASCADE;

CREATE OR REPLACE FUNCTION handle_order_stock_and_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_id          UUID;
    v_amount               NUMERIC;
    v_description          TEXT;
    v_advance_date         timestamptz;
    v_full_date            timestamptz;
    v_advance_amt          NUMERIC;
    v_full_amt             NUMERIC;
BEGIN
    -- -------------------------------------------------------------------------
    -- Stock reduction when the fulfilment status reaches 'delivered'/'Delivered'
    -- -------------------------------------------------------------------------
    IF (NEW.status IN ('delivered', 'Delivered'))
       AND (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'Delivered'))
    THEN
        UPDATE public.inventory_items
        SET current_stock = current_stock - soi.quantity,
            updated_at    = NOW()
        FROM public.sales_order_items soi
        WHERE soi.sales_order_id         = NEW.id
          AND public.inventory_items.id  = soi.product_id
          AND public.inventory_items.current_stock >= soi.quantity;
    END IF;

    -- -------------------------------------------------------------------------
    -- Financial transaction — keyed on order_number / category / type
    -- -------------------------------------------------------------------------
    SELECT id
    INTO   v_existing_id
    FROM   public.financial_transactions
    WHERE  reference_number = NEW.order_number
      AND  category         = 'sales'
      AND  type             = 'income'
    LIMIT  1;

    v_advance_date := NULL;
    v_full_date    := NULL;
    v_advance_amt  := NULL;
    v_full_amt     := NULL;

    IF NEW.order_status = 'Order Confirmed' THEN
        -- No money received yet — remove any earlier record
        IF v_existing_id IS NOT NULL THEN
            DELETE FROM public.financial_transactions WHERE id = v_existing_id;
        END IF;
        RETURN NEW;

    ELSIF NEW.order_status = 'Advance Paid' THEN
        v_amount := COALESCE(NEW.advance_payment_amount, 0);
        IF v_amount <= 0 THEN
            -- Advance amount is missing — nothing to record yet
            RETURN NEW;
        END IF;
        v_description  := 'Advance Paid - Sales Order ' || NEW.order_number;
        v_advance_date := NOW();
        v_advance_amt  := v_amount;

        -- Preserve pre-existing advance date if record already exists
        IF v_existing_id IS NOT NULL THEN
            SELECT COALESCE(advance_payment_date, NOW()),
                   COALESCE(advance_amount,       v_amount)
            INTO   v_advance_date, v_advance_amt
            FROM   public.financial_transactions
            WHERE  id = v_existing_id;
            -- Keep the recorded amount from the FIRST advance save
            v_amount := v_advance_amt;
        END IF;

    ELSIF NEW.order_status = 'Full Payment Done' THEN
        v_amount := COALESCE(NEW.total_amount, 0);
        IF v_amount <= 0 THEN
            RETURN NEW;
        END IF;
        v_description := 'Full Payment Done - Sales Order ' || NEW.order_number;
        v_full_date   := NOW();
        v_full_amt    := v_amount;

        -- Carry forward advance info from an existing record
        IF v_existing_id IS NOT NULL THEN
            SELECT advance_payment_date,
                   advance_amount
            INTO   v_advance_date, v_advance_amt
            FROM   public.financial_transactions
            WHERE  id = v_existing_id;
        END IF;

    ELSE
        -- Any other order_status (e.g. intermediate workflow steps):
        -- do not touch financial transactions
        RETURN NEW;
    END IF;

    -- -------------------------------------------------------------------------
    -- Upsert the finance record
    -- -------------------------------------------------------------------------
    IF v_existing_id IS NOT NULL THEN
        UPDATE public.financial_transactions
        SET amount               = v_amount,
            description          = v_description,
            date                 = NOW(),
            payment_method       = COALESCE(NEW.payment_method, 'manual'),
            updated_at           = NOW(),
            source_order_id      = NEW.id,
            transaction_source   = 'automatic',
            advance_payment_date = COALESCE(v_advance_date, advance_payment_date),
            advance_amount       = COALESCE(v_advance_amt,  advance_amount),
            full_payment_date    = COALESCE(v_full_date,    full_payment_date),
            full_amount          = COALESCE(v_full_amt,     full_amount)
        WHERE id = v_existing_id;
    ELSE
        INSERT INTO public.financial_transactions (
            business_id, type, amount, category, description,
            date, payment_method, reference_number, source_order_id,
            transaction_source,
            advance_payment_date, advance_amount,
            full_payment_date,   full_amount,
            created_at, updated_at
        ) VALUES (
            COALESCE(NEW.business_id, '550e8400-e29b-41d4-a716-446655440000'),
            'income',
            v_amount,
            'sales',
            v_description,
            NOW(),
            COALESCE(NEW.payment_method, 'manual'),
            NEW.order_number,
            NEW.id,
            'automatic',
            v_advance_date, v_advance_amt,
            v_full_date,    v_full_amt,
            NOW(), NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_order_stock_and_finance
    AFTER INSERT OR UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_stock_and_finance();

-- =============================================================================
-- Backfill: sync finance records for existing orders that are missing them
-- =============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            so.id,
            so.order_number,
            so.order_status,
            so.advance_payment_amount,
            so.total_amount,
            so.payment_method,
            so.business_id
        FROM public.sales_orders so
        WHERE so.order_status IN ('Advance Paid', 'Full Payment Done')
          AND NOT EXISTS (
              SELECT 1
              FROM public.financial_transactions ft
              WHERE ft.reference_number = so.order_number
                AND ft.category = 'sales'
                AND ft.type     = 'income'
          )
    LOOP
        IF r.order_status = 'Advance Paid' AND COALESCE(r.advance_payment_amount, 0) > 0 THEN
            INSERT INTO public.financial_transactions (
                business_id, type, amount, category, description,
                date, payment_method, reference_number, source_order_id,
                transaction_source,
                advance_payment_date, advance_amount,
                created_at, updated_at
            ) VALUES (
                COALESCE(r.business_id, '550e8400-e29b-41d4-a716-446655440000'),
                'income',
                r.advance_payment_amount,
                'sales',
                'Advance Paid - Sales Order ' || r.order_number,
                NOW(),
                COALESCE(r.payment_method, 'manual'),
                r.order_number,
                r.id,
                'automatic',
                NOW(), r.advance_payment_amount,
                NOW(), NOW()
            );

        ELSIF r.order_status = 'Full Payment Done' AND COALESCE(r.total_amount, 0) > 0 THEN
            INSERT INTO public.financial_transactions (
                business_id, type, amount, category, description,
                date, payment_method, reference_number, source_order_id,
                transaction_source,
                full_payment_date, full_amount,
                created_at, updated_at
            ) VALUES (
                COALESCE(r.business_id, '550e8400-e29b-41d4-a716-446655440000'),
                'income',
                r.total_amount,
                'sales',
                'Full Payment Done - Sales Order ' || r.order_number,
                NOW(),
                COALESCE(r.payment_method, 'manual'),
                r.order_number,
                r.id,
                'automatic',
                NOW(), r.total_amount,
                NOW(), NOW()
            );
        END IF;
    END LOOP;

    RAISE NOTICE '✅ Backfill complete: finance records created for orders missing them.';
END $$;
