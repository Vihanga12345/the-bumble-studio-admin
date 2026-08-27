-- Fix Status Changes to Work in Any Direction
-- Allows changing from ANY status to ANY status
-- Financial transaction always reflects current status

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
        UPDATE public.inventory_items 
        SET current_stock = current_stock - soi.quantity,
            updated_at = NOW()
        FROM public.sales_order_items soi
        WHERE soi.sales_order_id = NEW.id 
        AND public.inventory_items.id = soi.product_id
        AND public.inventory_items.current_stock >= soi.quantity;
    END IF;

    -- Always sync financial transaction with CURRENT order_status
    -- Removed OLD.order_status checks to allow changes in ANY direction
    
    -- Check if financial transaction exists for this order
    SELECT id INTO v_existing_transaction_id
    FROM public.financial_transactions
    WHERE reference_number = NEW.order_number
    AND category = 'sales'
    AND type = 'income'
    LIMIT 1;
    
    -- Determine amount and description based on CURRENT status
    IF NEW.order_status = 'Order Confirmed' THEN
        v_transaction_amount := 0;
        v_transaction_description := 'Order Confirmed - Sales Order ' || NEW.order_number;
        
    ELSIF NEW.order_status = 'Advance Paid' THEN
        v_transaction_amount := COALESCE(NEW.advance_payment_amount, 0);
        v_transaction_description := 'Advance Paid - Sales Order ' || NEW.order_number;
        
    ELSIF NEW.order_status = 'Full Payment Done' THEN
        v_transaction_amount := COALESCE(NEW.total_amount, 0);
        v_transaction_description := 'Full Payment Done - Sales Order ' || NEW.order_number;
        
    ELSE
        -- Default case (should not happen with constraint)
        v_transaction_amount := 0;
        v_transaction_description := 'Sales Order ' || NEW.order_number;
    END IF;
    
    -- Update existing transaction or create new one
    IF v_existing_transaction_id IS NOT NULL THEN
        -- UPDATE existing transaction
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
        -- INSERT new transaction
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE NEW TRIGGER
-- =====================================================
CREATE TRIGGER trigger_handle_order_stock_and_finance
    AFTER INSERT OR UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_stock_and_finance();

-- =====================================================
-- 4. ADD COMMENTS
-- =====================================================
COMMENT ON FUNCTION handle_order_stock_and_finance() IS 
'Syncs financial transactions with sales order status changes in ANY direction.
- Always updates transaction to match current status
- Order Confirmed: Amount = 0
- Advance Paid: Amount = advance_payment_amount
- Full Payment Done: Amount = total_amount
- Allows forward/backward/skip status changes
- Single transaction per order (upsert logic)';

COMMENT ON TRIGGER trigger_handle_order_stock_and_finance ON public.sales_orders IS
'Automatically syncs financial records with current order status - works in any direction';
