-- Fix calculate_sales_order_amounts trigger so it does NOT override
-- advance_payment_amount when advance_payment_percentage = 0.
-- Previously the trigger forced advance_payment_amount = 0 whenever
-- advance_payment_percentage was 0, wiping any manually entered advance.

CREATE OR REPLACE FUNCTION public.calculate_sales_order_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate discount amount based on percentage
    IF NEW.discount_percentage > 0 THEN
        NEW.discount_amount := ROUND((NEW.subtotal_amount * NEW.discount_percentage / 100), 2);
    ELSE
        NEW.discount_amount := COALESCE(NEW.discount_amount, 0);
    END IF;

    -- Only auto-calculate total_amount when subtotal is provided
    IF NEW.subtotal_amount IS NOT NULL AND NEW.subtotal_amount > 0 THEN
        NEW.total_amount := NEW.subtotal_amount - COALESCE(NEW.discount_amount, 0);
    END IF;

    -- Auto-calculate advance_payment_amount ONLY when percentage > 0.
    -- When percentage = 0, keep whatever value was manually provided.
    IF COALESCE(NEW.advance_payment_percentage, 0) > 0 THEN
        NEW.advance_payment_amount := ROUND(
            COALESCE(NEW.total_amount, 0) * NEW.advance_payment_percentage / 100,
            2
        );
    END IF;
    -- else: advance_payment_amount stays as whatever the caller sent

    -- Always recompute remaining_balance
    NEW.remaining_balance := GREATEST(
        ROUND(COALESCE(NEW.total_amount, 0) - COALESCE(NEW.advance_payment_amount, 0), 2),
        0
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger is active (recreate if needed)
DROP TRIGGER IF EXISTS trigger_calculate_sales_order_amounts ON public.sales_orders;
CREATE TRIGGER trigger_calculate_sales_order_amounts
    BEFORE INSERT OR UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_sales_order_amounts();
