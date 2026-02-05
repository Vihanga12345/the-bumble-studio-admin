-- Enhanced Sales Orders Schema
-- This script adds new fields for manual sales order creation with status tracking and advance payments

-- Add new columns to sales_orders table
DO $$
BEGIN
    -- Add customer_name if not exists (for manual entry without customer record)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'customer_name') THEN
        ALTER TABLE public.sales_orders ADD COLUMN customer_name TEXT;
    END IF;

    -- Add customer_address if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'customer_address') THEN
        ALTER TABLE public.sales_orders ADD COLUMN customer_address TEXT;
    END IF;

    -- Add customer_telephone if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'customer_telephone') THEN
        ALTER TABLE public.sales_orders ADD COLUMN customer_telephone TEXT;
    END IF;

    -- Add discount_percentage if not exists (for overall order discount)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'discount_percentage') THEN
        ALTER TABLE public.sales_orders ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;

    -- Add discount_amount if not exists (calculated discount)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'discount_amount') THEN
        ALTER TABLE public.sales_orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add advance_payment_percentage if not exists (default 50%)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'advance_payment_percentage') THEN
        ALTER TABLE public.sales_orders ADD COLUMN advance_payment_percentage DECIMAL(5,2) DEFAULT 50.00;
    END IF;

    -- Add advance_payment_amount if not exists (calculated advance)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'advance_payment_amount') THEN
        ALTER TABLE public.sales_orders ADD COLUMN advance_payment_amount DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add remaining_balance if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'remaining_balance') THEN
        ALTER TABLE public.sales_orders ADD COLUMN remaining_balance DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add order_status for detailed status tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'order_status') THEN
        ALTER TABLE public.sales_orders ADD COLUMN order_status TEXT DEFAULT 'Order Confirmed' 
            CHECK (order_status IN ('Order Confirmed', 'Advance Paid', 'Crafted', 'Delivered', 'Full Payment Done'));
    END IF;

    -- Add pdf_generated flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'pdf_generated') THEN
        ALTER TABLE public.sales_orders ADD COLUMN pdf_generated BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add pdf_url for storing generated PDF location
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'pdf_url') THEN
        ALTER TABLE public.sales_orders ADD COLUMN pdf_url TEXT;
    END IF;

    -- Add subtotal_amount (before discount)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'subtotal_amount') THEN
        ALTER TABLE public.sales_orders ADD COLUMN subtotal_amount DECIMAL(10,2) DEFAULT 0;
    END IF;

    RAISE NOTICE '✅ Enhanced sales orders columns added successfully';
END $$;

-- Create or replace function to calculate advance payment and remaining balance
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

    -- Calculate total_amount (subtotal - discount)
    NEW.total_amount := NEW.subtotal_amount - NEW.discount_amount;

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

-- Create trigger for automatic calculation on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_sales_order_amounts ON public.sales_orders;
CREATE TRIGGER trigger_calculate_sales_order_amounts
    BEFORE INSERT OR UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_order_amounts();

-- Add discount to sales_order_items if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_order_items' AND column_name = 'discount') THEN
        ALTER TABLE public.sales_order_items ADD COLUMN discount DECIMAL(10,2) DEFAULT 0;
    END IF;

    RAISE NOTICE '✅ Sales order items discount column added successfully';
END $$;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_status ON public.sales_orders(order_status);

-- Create index for customer telephone (for search)
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_telephone ON public.sales_orders(customer_telephone);

-- Update RLS policies if needed
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Policy for ERP users to manage sales orders
DROP POLICY IF EXISTS "ERP users can manage sales orders" ON public.sales_orders;
CREATE POLICY "ERP users can manage sales orders" ON public.sales_orders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.erp_users
            WHERE erp_users.id = auth.uid()
        )
    );

-- Policy for viewing sales orders
DROP POLICY IF EXISTS "Anyone can view sales orders" ON public.sales_orders;
CREATE POLICY "Anyone can view sales orders" ON public.sales_orders
    FOR SELECT
    USING (true);

-- Success! Enhanced Sales Orders schema update completed
-- New features added:
--   - Manual customer entry (name, address, telephone)
--   - Discount percentage and amount calculation
--   - Advance payment (default 50 percent) calculation
--   - Order status tracking (Order Confirmed, Advance Paid, Crafted, Delivered, Full Payment Done)
--   - PDF generation support
--   - Subtotal, discount, and remaining balance tracking
