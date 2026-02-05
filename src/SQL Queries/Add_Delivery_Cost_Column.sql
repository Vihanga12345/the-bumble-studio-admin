-- Add delivery_cost and ensure additional_costs column exists in sales_orders table
-- This fixes the PGRST204 error and adds delivery cost functionality

DO $$
BEGIN
    -- Add additional_costs column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'additional_costs') THEN
        ALTER TABLE public.sales_orders ADD COLUMN additional_costs DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ additional_costs column added successfully';
    ELSE
        RAISE NOTICE '⚠️ additional_costs column already exists';
    END IF;

    -- Add delivery_cost column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'delivery_cost') THEN
        ALTER TABLE public.sales_orders ADD COLUMN delivery_cost DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ delivery_cost column added successfully';
    ELSE
        RAISE NOTICE '⚠️ delivery_cost column already exists';
    END IF;

    -- Make sure the columns are not null restricted
    ALTER TABLE public.sales_orders ALTER COLUMN additional_costs SET DEFAULT 0;
    ALTER TABLE public.sales_orders ALTER COLUMN delivery_cost SET DEFAULT 0;

    RAISE NOTICE '✅ Sales orders table updated with additional_costs and delivery_cost columns';
END $$;

-- Update the calculate_sales_order_amounts function to include additional_costs and delivery_cost
CREATE OR REPLACE FUNCTION calculate_sales_order_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate subtotal from line items
    SELECT COALESCE(SUM((quantity * unit_price) - COALESCE(discount, 0)), 0)
    INTO NEW.subtotal_amount
    FROM public.sales_order_items
    WHERE sales_order_id = NEW.id;

    -- Calculate discount amount based on percentage
    IF NEW.discount_percentage > 0 THEN
        NEW.discount_amount := (NEW.subtotal_amount * NEW.discount_percentage / 100);
    ELSE
        NEW.discount_amount := 0;
    END IF;

    -- Ensure additional_costs and delivery_cost are not null
    NEW.additional_costs := COALESCE(NEW.additional_costs, 0);
    NEW.delivery_cost := COALESCE(NEW.delivery_cost, 0);

    -- Calculate total_amount (subtotal - discount + additional_costs + delivery_cost)
    NEW.total_amount := NEW.subtotal_amount - NEW.discount_amount + NEW.additional_costs + NEW.delivery_cost;

    -- Calculate advance payment (default 50%)
    IF NEW.advance_payment_percentage > 0 THEN
        NEW.advance_payment_amount := (NEW.total_amount * NEW.advance_payment_percentage / 100);
    ELSE
        NEW.advance_payment_amount := 0;
    END IF;

    -- Calculate remaining balance
    NEW.remaining_balance := NEW.total_amount - NEW.advance_payment_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_calculate_sales_order_amounts ON public.sales_orders;
CREATE TRIGGER trigger_calculate_sales_order_amounts
    BEFORE INSERT OR UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_order_amounts();

-- Final verification
DO $$
BEGIN
    RAISE NOTICE '✅ Sales order calculation function updated to include additional_costs and delivery_cost';
    RAISE NOTICE '✅ Database schema update completed successfully!';
END $$;
