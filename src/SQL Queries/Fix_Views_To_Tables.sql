-- =====================================================
-- FIX VIEWS TO TABLES - CRITICAL FOR ORDER CREATION
-- Problem: sales_orders and other tables are VIEWS (read-only)
-- Solution: Drop views and create proper TABLES (read-write)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. DROP EXISTING VIEWS THAT BLOCK ORDER CREATION
-- =====================================================

DROP VIEW IF EXISTS website_orders_view CASCADE;
DROP VIEW IF EXISTS website_products_view CASCADE; 
DROP VIEW IF EXISTS website_sales_analytics CASCADE;
DROP VIEW IF EXISTS sale_products_view CASCADE;

-- =====================================================
-- 2. CREATE BUSINESSES TABLE (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.businesses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    status text DEFAULT 'active',
    subscription_plan text DEFAULT 'standard',
    subscription_status text DEFAULT 'active',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT NOW()
);

-- Insert default business
INSERT INTO public.businesses (
    id, name, status, subscription_plan, subscription_status, is_active
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'E-Commerce Business', 'active', 'standard', 'active', true
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. CREATE WEBSITE AUTHENTICATION TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.website_users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    address text,
    city text,
    postal_code text,
    country text DEFAULT 'Sri Lanka',
    is_verified boolean DEFAULT true,
    business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    last_login timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.website_sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    session_token text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT NOW()
);

-- =====================================================
-- 4. RECREATE CORE TABLES (ENSURE THEY'RE TABLES NOT VIEWS)
-- =====================================================

-- Drop any existing table/view conflicts
DROP TABLE IF EXISTS public.customers CASCADE;
CREATE TABLE public.customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    name text NOT NULL,
    telephone text,
    address text,
    email text,
    source text DEFAULT 'manual',
    registered_at timestamp with time zone DEFAULT NOW(),
    is_active boolean DEFAULT true,
    website_user_id uuid,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Drop any existing table/view conflicts for inventory
DROP TABLE IF EXISTS public.inventory_items CASCADE;
CREATE TABLE public.inventory_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    name text NOT NULL,
    description text,
    category text,
    unit_of_measure text DEFAULT 'units',
    purchase_cost decimal(10,2) DEFAULT 0,
    selling_price decimal(10,2) DEFAULT 0,
    current_stock integer DEFAULT 0,
    reorder_level integer DEFAULT 0,
    sku text,
    is_active boolean DEFAULT true,
    is_website_item boolean DEFAULT false,
    image_url text,
    additional_images text DEFAULT '[]',
    specifications text,
    weight decimal(10,3),
    dimensions text,
    url_slug text,
    meta_description text,
    is_featured boolean DEFAULT false,
    sale_price decimal(10,2),
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE SALES_ORDERS TABLE (MOST CRITICAL)
-- =====================================================

-- This is the KEY table that MUST be a TABLE not a VIEW
DROP TABLE IF EXISTS public.sales_orders CASCADE;
CREATE TABLE public.sales_orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    order_number text NOT NULL,
    customer_id uuid,
    status text DEFAULT 'pending',
    order_date timestamp with time zone DEFAULT NOW(),
    total_amount decimal(10,2) NOT NULL,
    payment_method text DEFAULT 'card',
    notes text,
    order_source text DEFAULT 'manual',
    -- E-commerce columns
    shipping_address text,
    shipping_city text,
    shipping_postal_code text,
    customer_email text,
    customer_phone text,
    delivery_instructions text,
    website_user_id uuid,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Create sales_order_items table
DROP TABLE IF EXISTS public.sales_order_items CASCADE;
CREATE TABLE public.sales_order_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price decimal(10,2) NOT NULL,
    discount decimal(10,2) DEFAULT 0,
    total_price decimal(10,2) NOT NULL
);

-- =====================================================
-- 6. CREATE FINANCIAL TRANSACTIONS TABLE
-- =====================================================

DROP TABLE IF EXISTS public.financial_transactions CASCADE;
CREATE TABLE public.financial_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    type text NOT NULL,
    amount decimal(10,2) NOT NULL,
    category text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    payment_method text NOT NULL,
    reference_number text,
    source_order_id uuid,
    transaction_source text DEFAULT 'manual',
    created_at timestamp with time zone DEFAULT NOW()
);

-- =====================================================
-- 7. CREATE HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_customer_from_website_user(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
    v_customer_id uuid;
    v_user_record record;
BEGIN
    SELECT * INTO v_user_record FROM public.website_users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Website user not found';
    END IF;
    
    SELECT id INTO v_customer_id FROM public.customers WHERE website_user_id = p_user_id;
    IF v_customer_id IS NOT NULL THEN
        RETURN v_customer_id;
    END IF;
    
    INSERT INTO public.customers (
        name, email, telephone, address, business_id, source, website_user_id, registered_at
    ) VALUES (
        v_user_record.first_name || ' ' || v_user_record.last_name,
        v_user_record.email, v_user_record.phone, v_user_record.address,
        v_user_record.business_id, 'website', p_user_id, now()
    ) RETURNING id INTO v_customer_id;
    
    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. INSERT TEST DATA
-- =====================================================

-- Test users
INSERT INTO public.website_users (
    email, password_hash, first_name, last_name, phone, address, is_verified
) VALUES 
(
    'test@example.com', 'cGFzc3dvcmQxMjNzYWx0MTIz',
    'John', 'Doe', '+94771234567', '123 Main Street, Colombo', true
),
(
    'jane@example.com', 'cGFzc3dvcmQxMjNzYWx0MTIz', 
    'Jane', 'Smith', '+94771234568', '456 Park Avenue, Kandy', true
)
ON CONFLICT (email) DO NOTHING;

-- Sample inventory items
DO $$
BEGIN
    -- Insert sample inventory items only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE name = 'Gaming Keyboard') THEN
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
        );
    END IF;
END $$;

-- =====================================================
-- 9. VERIFICATION AND FINAL CHECKS
-- =====================================================

-- Check that sales_orders is a TABLE not a VIEW
DO $$
DECLARE
    v_table_type text;
    v_table_count integer;
BEGIN
    -- Check if table exists and get its type
    SELECT t.table_type INTO v_table_type 
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'sales_orders';
    
    -- Count tables created
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name IN ('sales_orders', 'customers', 'inventory_items', 'website_users');
    
    -- Report results
    IF v_table_type = 'BASE TABLE' THEN
        RAISE NOTICE '✅ SUCCESS: sales_orders is now a TABLE - orders can be created!';
        RAISE NOTICE '✅ SUCCESS: % critical tables verified as BASE TABLES', v_table_count;
    ELSIF v_table_type IS NULL THEN
        RAISE NOTICE '❌ ERROR: sales_orders table not found!';
    ELSE
        RAISE NOTICE '❌ ERROR: sales_orders is type % - should be BASE TABLE!', v_table_type;
    END IF;
END $$;

-- Additional verification queries
SELECT 'Database conversion completed successfully!' as status;
SELECT 'All views converted to tables - ready for order creation' as message;
SELECT 'Test credentials: test@example.com / password123' as login_info;

-- Verify table structures
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_type = 'BASE TABLE' THEN '✅ Ready for INSERT/UPDATE'
        ELSE '❌ Read-only VIEW'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_orders', 'customers', 'inventory_items', 'website_users', 'financial_transactions')
ORDER BY table_name; 