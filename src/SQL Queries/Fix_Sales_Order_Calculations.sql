-- Fix sales order calculations to ensure correct subtotal, total, and advance amounts
-- This updates the trigger to properly calculate amounts

-- Update the calculate_sales_order_amounts function with corrected logic
CREATE OR REPLACE FUNCTION calculate_sales_order_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate subtotal if this is an update and we have order items
    -- For new inserts, subtotal_amount should be set by the application
    IF TG_OP = 'UPDATE' OR NEW.subtotal_amount IS NULL OR NEW.subtotal_amount = 0 THEN
        -- Calculate subtotal from line items (sum of all item totals)
        SELECT COALESCE(SUM((quantity * unit_price) - COALESCE(discount, 0)), 0)
        INTO NEW.subtotal_amount
        FROM public.sales_order_items
        WHERE sales_order_id = NEW.id;
    END IF;

    -- Ensure all cost fields have default values
    NEW.discount_percentage := COALESCE(NEW.discount_percentage, 0);
    NEW.additional_costs := COALESCE(NEW.additional_costs, 0);
    NEW.delivery_cost := COALESCE(NEW.delivery_cost, 0);
    NEW.advance_payment_percentage := COALESCE(NEW.advance_payment_percentage, 50.00);

    -- Calculate discount amount based on percentage (applied to subtotal)
    IF NEW.discount_percentage > 0 THEN
        NEW.discount_amount := (NEW.subtotal_amount * NEW.discount_percentage / 100);
    ELSE
        NEW.discount_amount := 0;
    END IF;

    -- Calculate total_amount = subtotal - discount + additional_costs + delivery_cost
    NEW.total_amount := NEW.subtotal_amount - NEW.discount_amount + NEW.additional_costs + NEW.delivery_cost;

    -- Calculate advance payment based on total amount
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

-- Update existing orders to recalculate amounts
UPDATE public.sales_orders
SET updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT sales_order_id 
    FROM public.sales_order_items
);

DO $$
BEGIN
    RAISE NOTICE '✅ Sales order calculation function updated successfully!';
    RAISE NOTICE '✅ All existing orders have been recalculated';
END $$;
