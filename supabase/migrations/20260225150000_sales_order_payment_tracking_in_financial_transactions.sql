-- Add columns to track advance and full payment dates/amounts for sales-order-linked transactions

ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS advance_payment_date timestamptz,
ADD COLUMN IF NOT EXISTS advance_amount decimal(10,2),
ADD COLUMN IF NOT EXISTS full_payment_date timestamptz,
ADD COLUMN IF NOT EXISTS full_amount decimal(10,2);

-- Update trigger to set these when order_status changes
DROP TRIGGER IF EXISTS trigger_handle_order_stock_and_finance ON public.sales_orders;
DROP FUNCTION IF EXISTS handle_order_stock_and_finance() CASCADE;

CREATE OR REPLACE FUNCTION handle_order_stock_and_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_transaction_id UUID;
    v_transaction_amount NUMERIC;
    v_transaction_description TEXT;
    v_advance_date timestamptz;
    v_full_date timestamptz;
    v_advance_amt NUMERIC;
    v_full_amt NUMERIC;
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

    -- Check if financial transaction exists for this order
    SELECT id INTO v_existing_transaction_id
    FROM public.financial_transactions
    WHERE reference_number = NEW.order_number
    AND category = 'sales'
    AND type = 'income'
    LIMIT 1;
    
    v_advance_date := NULL;
    v_full_date := NULL;
    v_advance_amt := NULL;
    v_full_amt := NULL;
    
    IF NEW.order_status = 'Order Confirmed' THEN
        v_transaction_amount := 0;
        v_transaction_description := 'Order Confirmed - Sales Order ' || NEW.order_number;
        
    ELSIF NEW.order_status = 'Advance Paid' THEN
        v_transaction_amount := COALESCE(NEW.advance_payment_amount, 0);
        v_transaction_description := 'Advance Paid - Sales Order ' || NEW.order_number;
        v_advance_date := COALESCE(NEW.updated_at, NOW());
        v_advance_amt := COALESCE(NEW.advance_payment_amount, 0);
        
    ELSIF NEW.order_status = 'Full Payment Done' THEN
        v_transaction_amount := COALESCE(NEW.total_amount, 0);
        v_transaction_description := 'Full Payment Done - Sales Order ' || NEW.order_number;
        v_full_date := COALESCE(NEW.updated_at, NOW());
        v_full_amt := COALESCE(NEW.total_amount, 0);
        -- Preserve advance info if updating existing transaction
        IF v_existing_transaction_id IS NOT NULL THEN
            SELECT advance_payment_date, advance_amount INTO v_advance_date, v_advance_amt
            FROM public.financial_transactions WHERE id = v_existing_transaction_id;
        END IF;
        
    ELSE
        v_transaction_amount := 0;
        v_transaction_description := 'Sales Order ' || NEW.order_number;
    END IF;
    
    IF v_existing_transaction_id IS NOT NULL THEN
        UPDATE public.financial_transactions
        SET 
            amount = v_transaction_amount,
            description = v_transaction_description,
            date = COALESCE(NEW.updated_at, NEW.created_at, NOW()),
            payment_method = COALESCE(NEW.payment_method, 'manual'),
            updated_at = NOW(),
            source_order_id = NEW.id,
            transaction_source = 'automatic',
            advance_payment_date = COALESCE(v_advance_date, advance_payment_date),
            advance_amount = COALESCE(v_advance_amt, advance_amount),
            full_payment_date = COALESCE(v_full_date, full_payment_date),
            full_amount = COALESCE(v_full_amt, full_amount)
        WHERE id = v_existing_transaction_id;
    ELSE
        INSERT INTO public.financial_transactions (
            business_id, type, amount, category, description, date, payment_method,
            reference_number, source_order_id, transaction_source,
            advance_payment_date, advance_amount, full_payment_date, full_amount,
            created_at, updated_at
        ) VALUES (
            COALESCE(NEW.business_id, '550e8400-e29b-41d4-a716-446655440000'),
            'income', v_transaction_amount, 'sales', v_transaction_description,
            COALESCE(NEW.updated_at, NEW.created_at, NOW()),
            COALESCE(NEW.payment_method, 'manual'),
            NEW.order_number, NEW.id, 'automatic',
            v_advance_date, v_advance_amt, v_full_date, v_full_amt,
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

COMMENT ON COLUMN public.financial_transactions.advance_payment_date IS 'When sales order status changed to Advance Paid';
COMMENT ON COLUMN public.financial_transactions.advance_amount IS 'Advance payment amount for sales order';
COMMENT ON COLUMN public.financial_transactions.full_payment_date IS 'When sales order status changed to Full Payment Done';
COMMENT ON COLUMN public.financial_transactions.full_amount IS 'Full payment amount (total) for sales order';
