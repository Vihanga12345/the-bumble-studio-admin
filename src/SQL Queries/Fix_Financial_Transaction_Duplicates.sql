-- Fix Financial Transaction Duplicates
-- This script updates the trigger to prevent duplicate financial transactions
-- and ensures proper synchronization between orders and finance records

-- =====================================================
-- 1. DROP OLD TRIGGERS AND FUNCTIONS IF EXISTS
-- =====================================================
DROP TRIGGER IF EXISTS trigger_handle_order_stock_reduction ON public.sales_orders;
DROP TRIGGER IF EXISTS trigger_order_stock_reduction ON public.sales_orders;
DROP FUNCTION IF EXISTS handle_order_stock_reduction() CASCADE;

-- =====================================================
-- 2. CREATE IMPROVED TRIGGER FUNCTION (UPSERT LOGIC)
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
    -- Create transaction for advance payment when order_status = 'Advance Paid'
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
        v_transaction_description := 'Advance Payment - Sales Order ' || NEW.order_number;
        
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

    -- Update transaction to full amount when order_status = 'Full Payment Done'
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
        v_transaction_description := 'Full Payment - Sales Order ' || NEW.order_number;
        
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
-- 3. CREATE NEW TRIGGER
-- =====================================================
CREATE TRIGGER trigger_handle_order_stock_and_finance
    AFTER UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_stock_and_finance();

-- =====================================================
-- 4. ADD EDITABLE/DELETABLE COLUMNS TO FINANCIAL_TRANSACTIONS
-- =====================================================
DO $$
BEGIN
    -- Add is_editable column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' AND column_name = 'is_editable') THEN
        ALTER TABLE public.financial_transactions 
        ADD COLUMN is_editable BOOLEAN DEFAULT true;
        
        RAISE NOTICE '✅ Added is_editable column to financial_transactions';
    END IF;
    
    -- Add is_deletable column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' AND column_name = 'is_deletable') THEN
        ALTER TABLE public.financial_transactions 
        ADD COLUMN is_deletable BOOLEAN DEFAULT true;
        
        RAISE NOTICE '✅ Added is_deletable column to financial_transactions';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' AND column_name = 'updated_at') THEN
        ALTER TABLE public.financial_transactions 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE '✅ Added updated_at column to financial_transactions';
    END IF;
END $$;

-- =====================================================
-- 5. CLEANUP EXISTING DUPLICATES
-- =====================================================
DO $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- Create temp table to identify duplicates
    CREATE TEMP TABLE IF NOT EXISTS duplicate_transactions AS
    SELECT 
        id,
        reference_number,
        category,
        type,
        amount,
        date,
        ROW_NUMBER() OVER (
            PARTITION BY reference_number, category, type 
            ORDER BY date DESC, created_at DESC NULLS LAST
        ) as row_num
    FROM public.financial_transactions
    WHERE reference_number IS NOT NULL;

    -- Delete duplicates (keep only the first/most recent row for each group)
    WITH deleted AS (
        DELETE FROM public.financial_transactions
        WHERE id IN (
            SELECT id 
            FROM duplicate_transactions 
            WHERE row_num > 1
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;

    DROP TABLE IF EXISTS duplicate_transactions;

    RAISE NOTICE '📊 Deleted % duplicate financial transaction(s)', v_deleted_count;
END $$;

-- =====================================================
-- 6. CREATE INDEX FOR FASTER LOOKUPS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_financial_transactions_reference 
ON public.financial_transactions(reference_number, category, type);

DO $$
BEGIN
    RAISE NOTICE '✅ Financial transaction duplicate fix completed!';
    RAISE NOTICE '✅ Trigger updated to prevent future duplicates';
    RAISE NOTICE '✅ All transactions are now editable and deletable';
END $$;
