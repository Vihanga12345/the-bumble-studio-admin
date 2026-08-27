-- Sync Financial Records with Payment Status
-- This migration updates the trigger to create/update financial transactions
-- based on payment status (Advance Paid vs Full Payment Done)

-- =====================================================
-- 1. DROP OLD TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS trigger_handle_order_stock_and_finance ON public.sales_orders;
DROP FUNCTION IF EXISTS handle_order_stock_and_finance() CASCADE;

-- =====================================================
-- 2. CREATE IMPROVED TRIGGER FUNCTION
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
-- 4. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON FUNCTION handle_order_stock_and_finance() IS 
'Handles stock reduction and financial transaction creation/updates based on sales order status.
- Creates financial transaction with advance_payment_amount when order_status = Advance Paid
- Updates financial transaction with total_amount when order_status = Full Payment Done
- Reduces inventory stock when status = delivered';

COMMENT ON TRIGGER trigger_handle_order_stock_and_finance ON public.sales_orders IS
'Automatically manages stock levels and financial records when sales order status changes';
