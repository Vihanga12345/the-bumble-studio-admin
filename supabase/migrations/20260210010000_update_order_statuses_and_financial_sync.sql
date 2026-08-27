-- Update Order Statuses to Three Options Only
-- This migration simplifies sales order statuses to:
-- 1. Order Confirmed (Amount = 0)
-- 2. Advance Paid (Amount = advance_payment_amount)
-- 3. Full Payment Done (Amount = total_amount)

-- =====================================================
-- 1. DROP OLD TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS trigger_handle_order_stock_and_finance ON public.sales_orders;
DROP FUNCTION IF EXISTS handle_order_stock_and_finance() CASCADE;

-- =====================================================
-- 2. UPDATE EXISTING ORDERS TO NEW STATUS VALUES FIRST
-- =====================================================
-- Map old statuses to new ones BEFORE adding constraint
UPDATE public.sales_orders
SET order_status = CASE
    WHEN order_status = 'Crafted' THEN 'Advance Paid'
    WHEN order_status = 'Delivered' THEN 'Full Payment Done'
    WHEN order_status = 'Advance Payment' THEN 'Advance Paid'
    WHEN order_status IS NULL THEN 'Order Confirmed'
    WHEN order_status NOT IN ('Order Confirmed', 'Advance Paid', 'Full Payment Done') THEN 'Order Confirmed'
    ELSE order_status
END;

-- =====================================================
-- 3. UPDATE DATABASE CONSTRAINT FOR ORDER STATUS
-- =====================================================
-- Drop old constraint if exists
ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_order_status_check;

-- Add new constraint with only three statuses
ALTER TABLE public.sales_orders 
ADD CONSTRAINT sales_orders_order_status_check 
CHECK (order_status IN ('Order Confirmed', 'Advance Paid', 'Full Payment Done'));

-- =====================================================
-- 4. CREATE NEW TRIGGER FUNCTION WITH THREE STATUSES
-- =====================================================
CREATE OR REPLACE FUNCTION handle_order_stock_and_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_transaction_id UUID;
    v_transaction_amount NUMERIC;
    v_transaction_description TEXT;
BEGIN
    -- Handle stock reduction when status changes to 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        -- Reduce stock for each item in the order
        UPDATE public.inventory_items 
        SET current_stock = current_stock - soi.quantity,
            updated_at = NOW()
        FROM public.sales_order_items soi
        WHERE soi.sales_order_id = NEW.id 
        AND public.inventory_items.id = soi.product_id
        AND public.inventory_items.current_stock >= soi.quantity;
    END IF;

    -- Handle financial transactions based on order_status
    
    -- CASE 1: Order Confirmed - Create/Update with amount = 0
    IF NEW.order_status = 'Order Confirmed' AND (OLD.order_status IS NULL OR OLD.order_status != 'Order Confirmed') THEN
        
        -- Check if financial transaction already exists for this order
        SELECT id INTO v_existing_transaction_id
        FROM public.financial_transactions
        WHERE reference_number = NEW.order_number
        AND category = 'sales'
        AND type = 'income'
        LIMIT 1;
        
        -- Set amount to 0 for confirmed orders
        v_transaction_amount := 0;
        v_transaction_description := 'Order Confirmed - Sales Order ' || NEW.order_number;
        
        -- If transaction exists, update it. Otherwise, create new one.
        IF v_existing_transaction_id IS NOT NULL THEN
            UPDATE public.financial_transactions
            SET 
                amount = v_transaction_amount,
                description = v_transaction_description,
                date = COALESCE(NEW.updated_at, NEW.created_at, NOW()),
                payment_method = COALESCE(NEW.payment_method, 'manual'),
                updated_at = NOW(),
                source_order_id = NEW.id,
                transaction_source = 'automatic'
            WHERE id = v_existing_transaction_id;
        ELSE
            INSERT INTO public.financial_transactions (
                business_id, 
                type, 
                amount, 
                category, 
                description, 
                date, 
                payment_method,
                reference_number,
                source_order_id,
                transaction_source,
                created_at,
                updated_at
            ) VALUES (
                COALESCE(NEW.business_id, '550e8400-e29b-41d4-a716-446655440000'),
                'income',
                v_transaction_amount,
                'sales',
                v_transaction_description,
                COALESCE(NEW.updated_at, NEW.created_at, NOW()),
                COALESCE(NEW.payment_method, 'manual'),
                NEW.order_number,
                NEW.id,
                'automatic',
                NOW(),
                NOW()
            );
        END IF;
    END IF;

    -- CASE 2: Advance Paid - Create/Update with advance_payment_amount
    IF NEW.order_status = 'Advance Paid' AND (OLD.order_status IS NULL OR OLD.order_status != 'Advance Paid') THEN
        
        -- Check if financial transaction already exists for this order
        SELECT id INTO v_existing_transaction_id
        FROM public.financial_transactions
        WHERE reference_number = NEW.order_number
        AND category = 'sales'
        AND type = 'income'
        LIMIT 1;
        
        -- Set amount to advance payment amount
        v_transaction_amount := COALESCE(NEW.advance_payment_amount, 0);
        v_transaction_description := 'Advance Paid - Sales Order ' || NEW.order_number;
        
        -- If transaction exists, update it. Otherwise, create new one.
        IF v_existing_transaction_id IS NOT NULL THEN
            UPDATE public.financial_transactions
            SET 
                amount = v_transaction_amount,
                description = v_transaction_description,
                date = COALESCE(NEW.updated_at, NEW.created_at, NOW()),
                payment_method = COALESCE(NEW.payment_method, 'manual'),
                updated_at = NOW(),
                source_order_id = NEW.id,
                transaction_source = 'automatic'
            WHERE id = v_existing_transaction_id;
        ELSE
            INSERT INTO public.financial_transactions (
                business_id, 
                type, 
                amount, 
                category, 
                description, 
                date, 
                payment_method,
                reference_number,
                source_order_id,
                transaction_source,
                created_at,
                updated_at
            ) VALUES (
                COALESCE(NEW.business_id, '550e8400-e29b-41d4-a716-446655440000'),
                'income',
                v_transaction_amount,
                'sales',
                v_transaction_description,
                COALESCE(NEW.updated_at, NEW.created_at, NOW()),
                COALESCE(NEW.payment_method, 'manual'),
                NEW.order_number,
                NEW.id,
                'automatic',
                NOW(),
                NOW()
            );
        END IF;
    END IF;

    -- CASE 3: Full Payment Done - Create/Update with total_amount
    IF NEW.order_status = 'Full Payment Done' AND (OLD.order_status IS NULL OR OLD.order_status != 'Full Payment Done') THEN
        
        -- Check if financial transaction already exists for this order
        SELECT id INTO v_existing_transaction_id
        FROM public.financial_transactions
        WHERE reference_number = NEW.order_number
        AND category = 'sales'
        AND type = 'income'
        LIMIT 1;
        
        -- Set amount to total amount
        v_transaction_amount := COALESCE(NEW.total_amount, 0);
        v_transaction_description := 'Full Payment Done - Sales Order ' || NEW.order_number;
        
        -- If transaction exists, update it. Otherwise, create new one.
        IF v_existing_transaction_id IS NOT NULL THEN
            UPDATE public.financial_transactions
            SET 
                amount = v_transaction_amount,
                description = v_transaction_description,
                date = COALESCE(NEW.updated_at, NEW.created_at, NOW()),
                payment_method = COALESCE(NEW.payment_method, 'manual'),
                updated_at = NOW(),
                source_order_id = NEW.id,
                transaction_source = 'automatic'
            WHERE id = v_existing_transaction_id;
        ELSE
            INSERT INTO public.financial_transactions (
                business_id, 
                type, 
                amount, 
                category, 
                description, 
                date, 
                payment_method,
                reference_number,
                source_order_id,
                transaction_source,
                created_at,
                updated_at
            ) VALUES (
                COALESCE(NEW.business_id, '550e8400-e29b-41d4-a716-446655440000'),
                'income',
                v_transaction_amount,
                'sales',
                v_transaction_description,
                COALESCE(NEW.updated_at, NEW.created_at, NOW()),
                COALESCE(NEW.payment_method, 'manual'),
                NEW.order_number,
                NEW.id,
                'automatic',
                NOW(),
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE NEW TRIGGER
-- =====================================================
CREATE TRIGGER trigger_handle_order_stock_and_finance
    AFTER INSERT OR UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_stock_and_finance();

-- =====================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON FUNCTION handle_order_stock_and_finance() IS 
'Handles stock reduction and financial transaction creation/updates based on sales order status.
- Order Confirmed: Creates/updates financial transaction with amount = 0
- Advance Paid: Creates/updates financial transaction with advance_payment_amount
- Full Payment Done: Creates/updates financial transaction with total_amount
- Updates same transaction when status changes (no duplicates)
- Reduces inventory stock when status = delivered';

COMMENT ON TRIGGER trigger_handle_order_stock_and_finance ON public.sales_orders IS
'Automatically manages stock levels and financial records when sales order status changes';

-- =====================================================
-- 7. UPDATE EXISTING FINANCIAL TRANSACTIONS
-- =====================================================
-- Update existing transactions to match current order statuses
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT so.id, so.order_number, so.order_status, so.advance_payment_amount, so.total_amount, so.payment_method, so.business_id
        FROM public.sales_orders so
        WHERE so.order_status IN ('Order Confirmed', 'Advance Paid', 'Full Payment Done')
    LOOP
        -- Update or create financial transaction based on current status
        IF r.order_status = 'Order Confirmed' THEN
            INSERT INTO public.financial_transactions (
                business_id, type, amount, category, description, date, 
                payment_method, reference_number, source_order_id, transaction_source, created_at, updated_at
            ) VALUES (
                COALESCE(r.business_id, '550e8400-e29b-41d4-a716-446655440000'),
                'income', 0, 'sales',
                'Order Confirmed - Sales Order ' || r.order_number,
                NOW(), COALESCE(r.payment_method, 'manual'), r.order_number,
                r.id, 'automatic', NOW(), NOW()
            )
            ON CONFLICT DO NOTHING;
            
        ELSIF r.order_status = 'Advance Paid' THEN
            -- Update existing or insert new
            WITH upsert AS (
                UPDATE public.financial_transactions
                SET amount = COALESCE(r.advance_payment_amount, 0),
                    description = 'Advance Paid - Sales Order ' || r.order_number,
                    updated_at = NOW(),
                    source_order_id = r.id,
                    transaction_source = 'automatic'
                WHERE reference_number = r.order_number
                AND category = 'sales'
                AND type = 'income'
                RETURNING id
            )
            INSERT INTO public.financial_transactions (
                business_id, type, amount, category, description, date,
                payment_method, reference_number, source_order_id, transaction_source, created_at, updated_at
            )
            SELECT 
                COALESCE(r.business_id, '550e8400-e29b-41d4-a716-446655440000'),
                'income', COALESCE(r.advance_payment_amount, 0), 'sales',
                'Advance Paid - Sales Order ' || r.order_number,
                NOW(), COALESCE(r.payment_method, 'manual'), r.order_number,
                r.id, 'automatic', NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM upsert);
            
        ELSIF r.order_status = 'Full Payment Done' THEN
            -- Update existing or insert new
            WITH upsert AS (
                UPDATE public.financial_transactions
                SET amount = COALESCE(r.total_amount, 0),
                    description = 'Full Payment Done - Sales Order ' || r.order_number,
                    updated_at = NOW(),
                    source_order_id = r.id,
                    transaction_source = 'automatic'
                WHERE reference_number = r.order_number
                AND category = 'sales'
                AND type = 'income'
                RETURNING id
            )
            INSERT INTO public.financial_transactions (
                business_id, type, amount, category, description, date,
                payment_method, reference_number, source_order_id, transaction_source, created_at, updated_at
            )
            SELECT 
                COALESCE(r.business_id, '550e8400-e29b-41d4-a716-446655440000'),
                'income', COALESCE(r.total_amount, 0), 'sales',
                'Full Payment Done - Sales Order ' || r.order_number,
                NOW(), COALESCE(r.payment_method, 'manual'), r.order_number,
                r.id, 'automatic', NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM upsert);
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Updated financial transactions for existing orders';
END $$;
