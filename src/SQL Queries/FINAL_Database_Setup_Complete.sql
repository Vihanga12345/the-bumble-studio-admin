-- =====================================================
-- FINAL COMPLETE DATABASE SETUP FOR ERP + E-COMMERCE
-- This script creates all missing components for full integration
-- =====================================================

SELECT 'Starting complete database setup for ERP + E-commerce integration...' as setup_status;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key constraints that are missing
ALTER TABLE public.sales_order_items 
DROP CONSTRAINT IF EXISTS sales_order_items_sales_order_id_fkey,
ADD CONSTRAINT sales_order_items_sales_order_id_fkey 
FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;

ALTER TABLE public.sales_order_items 
DROP CONSTRAINT IF EXISTS sales_order_items_product_id_fkey,
ADD CONSTRAINT sales_order_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.inventory_items(id);

ALTER TABLE public.sales_orders 
DROP CONSTRAINT IF EXISTS sales_orders_customer_id_fkey,
ADD CONSTRAINT sales_orders_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE public.sales_orders 
DROP CONSTRAINT IF EXISTS sales_orders_website_user_id_fkey,
ADD CONSTRAINT sales_orders_website_user_id_fkey 
FOREIGN KEY (website_user_id) REFERENCES public.website_users(id);

ALTER TABLE public.website_sessions 
DROP CONSTRAINT IF EXISTS website_sessions_user_id_fkey,
ADD CONSTRAINT website_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.website_users(id) ON DELETE CASCADE;

SELECT 'Foreign key constraints added successfully' as constraint_status;

-- =====================================================
-- 2. ADD MISSING INDEXES FOR PERFORMANCE
-- =====================================================

-- Critical indexes for e-commerce performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_website_user_id ON public.sales_orders(website_user_id) WHERE website_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_source ON public.sales_orders(order_source);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_business_date ON public.sales_orders(business_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_website ON public.inventory_items(business_id, is_website_item) WHERE is_website_item = true;
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_website_user ON public.customers(website_user_id) WHERE website_user_id IS NOT NULL;

SELECT 'Performance indexes created successfully' as index_status;

-- =====================================================
-- 3. ADD STATUS CONSTRAINTS AND VALIDATIONS
-- =====================================================

-- Add proper status constraints
ALTER TABLE public.sales_orders 
DROP CONSTRAINT IF EXISTS sales_orders_status_check,
ADD CONSTRAINT sales_orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));

ALTER TABLE public.sales_orders 
DROP CONSTRAINT IF EXISTS sales_orders_order_source_check,
ADD CONSTRAINT sales_orders_order_source_check 
CHECK (order_source IN ('manual', 'website', 'api'));

ALTER TABLE public.financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_type_check,
ADD CONSTRAINT financial_transactions_type_check 
CHECK (type IN ('income', 'expense'));

SELECT 'Status constraints added successfully' as validation_status;

-- =====================================================
-- 4. CREATE STOCK REDUCTION TRIGGER FUNCTION
-- =====================================================

-- Function to handle stock reduction when order status changes to 'delivered'
CREATE OR REPLACE FUNCTION handle_order_stock_reduction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only reduce stock when status changes to 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        -- Reduce stock for each item in the order
        UPDATE public.inventory_items 
        SET current_stock = current_stock - soi.quantity,
            updated_at = NOW()
        FROM public.sales_order_items soi
        WHERE soi.sales_order_id = NEW.id 
        AND public.inventory_items.id = soi.product_id
        AND public.inventory_items.current_stock >= soi.quantity;
        
        -- Log the stock reduction as financial transaction
        INSERT INTO public.financial_transactions (
            business_id, type, amount, category, description, date, payment_method,
            reference_number, source_order_id, transaction_source
        ) VALUES (
            NEW.business_id, 'income', NEW.total_amount, 'Sales Revenue',
            'Revenue from order: ' || NEW.order_number,
            NEW.updated_at, NEW.payment_method, NEW.order_number,
            NEW.id, NEW.order_source
        );
        
        -- Log status change
        INSERT INTO public.sales_order_status_history (
            sales_order_id, previous_status, new_status, changed_at, reason
        ) VALUES (
            NEW.id, OLD.status, NEW.status, NOW(), 'Order delivered - stock reduced'
        );
    END IF;
    
    -- Log all status changes
    IF OLD.status IS NOT NULL AND OLD.status != NEW.status THEN
        INSERT INTO public.sales_order_status_history (
            sales_order_id, previous_status, new_status, changed_at, reason
        ) VALUES (
            NEW.id, OLD.status, NEW.status, NOW(), 'Status updated via ERP'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_order_stock_reduction ON public.sales_orders;
CREATE TRIGGER trigger_order_stock_reduction
    AFTER UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_stock_reduction();

SELECT 'Stock reduction trigger created successfully' as trigger_status;

-- =====================================================
-- 5. CREATE ORDER MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create customer from website user (enhanced)
CREATE OR REPLACE FUNCTION create_customer_from_website_user(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
    v_customer_id uuid;
    v_user_record record;
BEGIN
    -- Get user record
    SELECT * INTO v_user_record FROM public.website_users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Website user with id % not found', p_user_id;
    END IF;
    
    -- Check if customer already exists
    SELECT id INTO v_customer_id FROM public.customers WHERE website_user_id = p_user_id;
    IF v_customer_id IS NOT NULL THEN
        RETURN v_customer_id;
    END IF;
    
    -- Create new customer
    INSERT INTO public.customers (
        name, email, telephone, address, business_id, source, website_user_id, registered_at
    ) VALUES (
        v_user_record.first_name || ' ' || v_user_record.last_name,
        v_user_record.email, 
        v_user_record.phone, 
        COALESCE(v_user_record.address, '') || 
        CASE WHEN v_user_record.city IS NOT NULL THEN ', ' || v_user_record.city ELSE '' END ||
        CASE WHEN v_user_record.postal_code IS NOT NULL THEN ' ' || v_user_record.postal_code ELSE '' END,
        v_user_record.business_id, 
        'website', 
        p_user_id, 
        NOW()
    ) RETURNING id INTO v_customer_id;
    
    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
    v_sequence integer;
    v_date_part text;
    v_order_number text;
BEGIN
    -- Get current date part (YYYYMMDD)
    v_date_part := to_char(NOW(), 'YYYYMMDD');
    
    -- Get next sequence for today
    SELECT COALESCE(MAX(
        CASE 
            WHEN order_number ~ ('^WEB' || v_date_part || '[0-9]+$') 
            THEN CAST(SUBSTRING(order_number FROM LENGTH('WEB' || v_date_part) + 1) AS integer)
            ELSE 0
        END
    ), 0) + 1
    INTO v_sequence
    FROM public.sales_orders 
    WHERE order_source = 'website';
    
    -- Return formatted order number
    v_order_number := 'WEB' || v_date_part || LPAD(v_sequence::text, 3, '0');
    
    RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to create website order
CREATE OR REPLACE FUNCTION create_website_order(
    p_user_id uuid,
    p_total_amount decimal,
    p_payment_method text,
    p_shipping_address text,
    p_shipping_city text,
    p_shipping_postal_code text,
    p_delivery_instructions text,
    p_order_items jsonb
) RETURNS uuid AS $$
DECLARE
    v_customer_id uuid;
    v_order_id uuid;
    v_order_number text;
    v_item record;
    v_user_record record;
BEGIN
    -- Get user details
    SELECT * INTO v_user_record FROM public.website_users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Create or get customer
    v_customer_id := create_customer_from_website_user(p_user_id);
    
    -- Generate order number
    v_order_number := generate_order_number();
    
    -- Create sales order
    INSERT INTO public.sales_orders (
        business_id, order_number, customer_id, status, total_amount, 
        payment_method, order_source, shipping_address, shipping_city, 
        shipping_postal_code, customer_email, customer_phone, 
        delivery_instructions, website_user_id
    ) VALUES (
        v_user_record.business_id, v_order_number, v_customer_id, 'pending', 
        p_total_amount, p_payment_method, 'website', p_shipping_address, 
        p_shipping_city, p_shipping_postal_code, v_user_record.email, 
        v_user_record.phone, p_delivery_instructions, p_user_id
    ) RETURNING id INTO v_order_id;
    
    -- Create order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
    LOOP
        INSERT INTO public.sales_order_items (
            sales_order_id, product_id, quantity, unit_price, total_price
        ) VALUES (
            v_order_id,
            (v_item.value->>'product_id')::uuid,
            (v_item.value->>'quantity')::integer,
            (v_item.value->>'unit_price')::decimal,
            (v_item.value->>'total_price')::decimal
        );
    END LOOP;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

SELECT 'Order management functions created successfully' as function_status;

-- =====================================================
-- 6. CREATE VIEWS FOR ERP INTEGRATION
-- =====================================================

-- View for website orders in ERP
CREATE OR REPLACE VIEW website_orders_for_erp AS
SELECT 
    so.id,
    so.order_number,
    so.status,
    so.order_date,
    so.total_amount,
    so.payment_method,
    so.shipping_address,
    so.shipping_city,
    so.shipping_postal_code,
    so.customer_email,
    so.customer_phone,
    so.delivery_instructions,
    wu.first_name || ' ' || wu.last_name as customer_name,
    wu.email as user_email,
    c.name as customer_record_name,
    -- Order items as JSON
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'product_id', soi.product_id,
                'product_name', ii.name,
                'quantity', soi.quantity,
                'unit_price', soi.unit_price,
                'total_price', soi.total_price,
                'sku', ii.sku
            )
        )
        FROM public.sales_order_items soi
        LEFT JOIN public.inventory_items ii ON soi.product_id = ii.id
        WHERE soi.sales_order_id = so.id
    ) as order_items,
    so.created_at,
    so.updated_at
FROM public.sales_orders so
LEFT JOIN public.website_users wu ON so.website_user_id = wu.id
LEFT JOIN public.customers c ON so.customer_id = c.id
WHERE so.order_source = 'website'
ORDER BY so.created_at DESC;

-- View for order status history
CREATE OR REPLACE VIEW order_status_tracking AS
SELECT 
    osh.id,
    osh.sales_order_id,
    so.order_number,
    osh.previous_status,
    osh.new_status,
    osh.changed_at,
    osh.reason,
    osh.notes
FROM public.sales_order_status_history osh
LEFT JOIN public.sales_orders so ON osh.sales_order_id = so.id
ORDER BY osh.changed_at DESC;

SELECT 'ERP integration views created successfully' as view_status;

-- =====================================================
-- 7. INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Ensure test users exist
INSERT INTO public.website_users (
    email, password_hash, first_name, last_name, phone, address, city, postal_code, is_verified
) VALUES 
(
    'test@example.com', 'cGFzc3dvcmQxMjNzYWx0MTIz',
    'John', 'Doe', '+94771234567', '123 Main Street', 'Colombo', '10100', true
),
(
    'jane@example.com', 'cGFzc3dvcmQxMjNzYWx0MTIz', 
    'Jane', 'Smith', '+94771234568', '456 Park Avenue', 'Kandy', '20000', true
)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    is_verified = EXCLUDED.is_verified,
    updated_at = NOW();

-- Ensure test products exist
INSERT INTO public.inventory_items (
    name, description, category, unit_of_measure, purchase_cost, selling_price, 
    current_stock, is_website_item, image_url, is_active, sku
) VALUES 
(
    'Gaming Keyboard', 'Mechanical RGB Gaming Keyboard', 'Electronics', 'units', 
    50.00, 75.00, 100, true, 
    'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=400&fit=crop', 
    true, 'WEB-KB-001'
),
(
    'Wireless Mouse', 'Ergonomic Wireless Mouse', 'Electronics', 'units',
    20.00, 35.00, 150, true,
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop',
    true, 'WEB-MS-001'
),
(
    'Bluetooth Speaker', 'Portable Bluetooth Speaker', 'Electronics', 'units',
    30.00, 50.00, 75, true,
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop',
    true, 'WEB-SP-001'
),
(
    'USB Cable', 'High-Speed USB-C Cable', 'Electronics', 'units',
    5.00, 15.00, 200, true,
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
    true, 'WEB-CB-001'
),
(
    'Phone Stand', 'Adjustable Phone Stand', 'Accessories', 'units',
    8.00, 20.00, 120, true,
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&h=400&fit=crop',
    true, 'WEB-PS-001'
)
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    selling_price = EXCLUDED.selling_price,
    current_stock = EXCLUDED.current_stock,
    image_url = EXCLUDED.image_url,
    is_website_item = EXCLUDED.is_website_item,
    updated_at = NOW();

-- Create sample orders for testing
DO $$
DECLARE
    v_user_id uuid;
    v_keyboard_id uuid;
    v_mouse_id uuid;
    v_order_id uuid;
BEGIN
    -- Get test user
    SELECT id INTO v_user_id FROM public.website_users WHERE email = 'test@example.com';
    
    -- Get product IDs
    SELECT id INTO v_keyboard_id FROM public.inventory_items WHERE sku = 'WEB-KB-001';
    SELECT id INTO v_mouse_id FROM public.inventory_items WHERE sku = 'WEB-MS-001';
    
    IF v_user_id IS NOT NULL AND v_keyboard_id IS NOT NULL AND v_mouse_id IS NOT NULL THEN
        -- Create sample order
        v_order_id := create_website_order(
            v_user_id,
            110.00,
            'card',
            '123 Main Street',
            'Colombo',
            '10100',
            'Please deliver during business hours',
            '[
                {"product_id": "' || v_keyboard_id || '", "quantity": 1, "unit_price": 75.00, "total_price": 75.00},
                {"product_id": "' || v_mouse_id || '", "quantity": 1, "unit_price": 35.00, "total_price": 35.00}
            ]'::jsonb
        );
        
        RAISE NOTICE 'Sample order created with ID: %', v_order_id;
    END IF;
END $$;

SELECT 'Sample data inserted successfully' as sample_status;

-- =====================================================
-- 8. VERIFICATION AND FINAL STATUS
-- =====================================================

-- Verify everything is working
SELECT 
    'Database Setup Complete!' as final_status,
    COUNT(*) as website_orders_count
FROM public.sales_orders 
WHERE order_source = 'website';

-- Show website orders for verification
SELECT 
    'Website Orders Ready for ERP Management:' as message,
    order_number,
    status,
    total_amount,
    customer_email,
    created_at
FROM website_orders_for_erp
LIMIT 5;

-- Show available statuses
SELECT 'Available Order Statuses:' as status_info, 
       unnest(ARRAY['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']) as status;

SELECT 'SETUP COMPLETE! E-commerce orders can now be managed from ERP!' as completion_message;
SELECT 'Test credentials: test@example.com / password123' as login_info; 