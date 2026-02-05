-- =====================================================
-- BULLETPROOF DATABASE SETUP FOR MINI ERP SYSTEM
-- This script safely creates/updates all required tables and columns
-- Handles existing data and ensures compatibility
-- =====================================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create businesses table first (foundational)
CREATE TABLE IF NOT EXISTS public.businesses (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'trial'::text])),
    subscription_plan text NOT NULL DEFAULT 'trial'::text CHECK (subscription_plan = ANY (ARRAY['trial'::text, 'basic'::text, 'standard'::text, 'premium'::text, 'enterprise'::text])),
    subscription_status text DEFAULT 'active'::text CHECK (subscription_status = ANY (ARRAY['active'::text, 'cancelled'::text, 'past_due'::text, 'suspended'::text])),
    is_active boolean DEFAULT true,
    max_users integer DEFAULT 5,
    trial_start_date timestamp with time zone DEFAULT now(),
    trial_end_date timestamp with time zone DEFAULT (now() + '30 days'::interval),
    subscription_start_date timestamp with time zone,
    subscription_end_date timestamp with time zone,
    grace_period_end_date timestamp with time zone,
    manager_id uuid,
    contact_email text,
    contact_phone text,
    business_address text,
    address text,
    city text,
    state_province text,
    country text,
    postal_code text,
    phone_number text,
    email text,
    tax_id text,
    logo_url text,
    is_custom_plan boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT businesses_pkey PRIMARY KEY (id)
);

-- Insert default business if it doesn't exist
INSERT INTO public.businesses (id, name, contact_email, status)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Default Business', 'admin@defaultbusiness.com', 'active')
ON CONFLICT (id) DO NOTHING;

-- Create inventory_items table with all required columns
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    category text,
    unit_of_measure text NOT NULL CHECK (unit_of_measure = ANY (ARRAY['units'::text, 'kg'::text, 'liters'::text, 'meters'::text, 'pieces'::text])),
    purchase_cost numeric NOT NULL,
    selling_price numeric NOT NULL,
    current_stock integer DEFAULT 0,
    reorder_level integer DEFAULT 0,
    sku text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    business_id uuid NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    is_website_item boolean DEFAULT false,
    image_url text,
    additional_images jsonb DEFAULT '[]'::jsonb,
    specifications jsonb DEFAULT '{}'::jsonb,
    weight numeric DEFAULT 0,
    dimensions jsonb DEFAULT '{"width": 0, "height": 0, "length": 0}'::jsonb,
    url_slug text,
    meta_description text,
    is_featured boolean DEFAULT false,
    sale_price numeric,
    CONSTRAINT inventory_items_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_items_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

-- Add missing columns to inventory_items if they don't exist
DO $$
BEGIN
    -- Add business_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'business_id') THEN
        ALTER TABLE public.inventory_items ADD COLUMN business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';
        UPDATE public.inventory_items SET business_id = '550e8400-e29b-41d4-a716-446655440000' WHERE business_id IS NULL;
        ALTER TABLE public.inventory_items ALTER COLUMN business_id SET NOT NULL;
    END IF;

    -- Add website-related columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'is_website_item') THEN
        ALTER TABLE public.inventory_items ADD COLUMN is_website_item boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'image_url') THEN
        ALTER TABLE public.inventory_items ADD COLUMN image_url text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'additional_images') THEN
        ALTER TABLE public.inventory_items ADD COLUMN additional_images jsonb DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'specifications') THEN
        ALTER TABLE public.inventory_items ADD COLUMN specifications jsonb DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'weight') THEN
        ALTER TABLE public.inventory_items ADD COLUMN weight numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'dimensions') THEN
        ALTER TABLE public.inventory_items ADD COLUMN dimensions jsonb DEFAULT '{"width": 0, "height": 0, "length": 0}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'url_slug') THEN
        ALTER TABLE public.inventory_items ADD COLUMN url_slug text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'meta_description') THEN
        ALTER TABLE public.inventory_items ADD COLUMN meta_description text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'is_featured') THEN
        ALTER TABLE public.inventory_items ADD COLUMN is_featured boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'sale_price') THEN
        ALTER TABLE public.inventory_items ADD COLUMN sale_price numeric;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_items_business_id_fkey' 
        AND table_name = 'inventory_items'
    ) THEN
        ALTER TABLE public.inventory_items 
        ADD CONSTRAINT inventory_items_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES public.businesses(id);
    END IF;
END $$;

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    telephone text,
    address text,
    email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    business_id uuid NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    source text DEFAULT 'manual'::text CHECK (source = ANY (ARRAY['manual'::text, 'website'::text, 'import'::text, 'api'::text])),
    registered_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customers_pkey PRIMARY KEY (id),
    CONSTRAINT customers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

-- Add business_id to customers if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'business_id') THEN
        ALTER TABLE public.customers ADD COLUMN business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';
        UPDATE public.customers SET business_id = '550e8400-e29b-41d4-a716-446655440000' WHERE business_id IS NULL;
        ALTER TABLE public.customers ALTER COLUMN business_id SET NOT NULL;
    END IF;
END $$;

-- Create sales_orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    order_number text NOT NULL,
    customer_id uuid,
    status text NOT NULL CHECK (status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'shipped'::text, 'delivered'::text, 'pending'::text, 'processing'::text, 'completed'::text, 'cancelled'::text])),
    order_date timestamp with time zone DEFAULT now(),
    total_amount numeric NOT NULL,
    payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'bank'::text, 'internal'::text])),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    business_id uuid NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    order_source text DEFAULT 'manual'::text CHECK (order_source = ANY (ARRAY['manual'::text, 'website'::text, 'api'::text, 'import'::text])),
    CONSTRAINT sales_orders_pkey PRIMARY KEY (id),
    CONSTRAINT sales_orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id),
    CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);

-- Add missing columns to sales_orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'business_id') THEN
        ALTER TABLE public.sales_orders ADD COLUMN business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';
        UPDATE public.sales_orders SET business_id = '550e8400-e29b-41d4-a716-446655440000' WHERE business_id IS NULL;
        ALTER TABLE public.sales_orders ALTER COLUMN business_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'order_source') THEN
        ALTER TABLE public.sales_orders ADD COLUMN order_source text DEFAULT 'manual'::text CHECK (order_source = ANY (ARRAY['manual'::text, 'website'::text, 'api'::text, 'import'::text]));
    END IF;
END $$;

-- Create sales_order_items table
CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    sales_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    discount numeric DEFAULT 0,
    total_price numeric NOT NULL,
    CONSTRAINT sales_order_items_pkey PRIMARY KEY (id),
    CONSTRAINT sales_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.inventory_items(id),
    CONSTRAINT sales_order_items_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id)
);

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    type text NOT NULL CHECK (type = ANY (ARRAY['income'::text, 'expense'::text])),
    amount numeric NOT NULL,
    category text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'bank'::text, 'internal'::text])),
    reference_number text,
    created_at timestamp with time zone DEFAULT now(),
    business_id uuid NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    source_order_id uuid,
    transaction_source text DEFAULT 'manual'::text CHECK (transaction_source = ANY (ARRAY['manual'::text, 'website'::text, 'api'::text, 'automatic'::text])),
    CONSTRAINT financial_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT financial_transactions_source_order_id_fkey FOREIGN KEY (source_order_id) REFERENCES public.sales_orders(id),
    CONSTRAINT financial_transactions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

-- Add missing columns to financial_transactions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'business_id') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';
        UPDATE public.financial_transactions SET business_id = '550e8400-e29b-41d4-a716-446655440000' WHERE business_id IS NULL;
        ALTER TABLE public.financial_transactions ALTER COLUMN business_id SET NOT NULL;
    END IF;
END $$;

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    telephone text,
    address text,
    payment_terms text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    business_id uuid NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    CONSTRAINT suppliers_pkey PRIMARY KEY (id),
    CONSTRAINT suppliers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

-- Add business_id to suppliers if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'business_id') THEN
        ALTER TABLE public.suppliers ADD COLUMN business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';
        UPDATE public.suppliers SET business_id = '550e8400-e29b-41d4-a716-446655440000' WHERE business_id IS NULL;
        ALTER TABLE public.suppliers ALTER COLUMN business_id SET NOT NULL;
    END IF;
END $$;

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    order_number text NOT NULL,
    supplier_id uuid NOT NULL,
    status text NOT NULL CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'received'::text, 'completed'::text, 'cancelled'::text])),
    total_amount numeric NOT NULL,
    expected_delivery_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    business_id uuid NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
    CONSTRAINT purchase_orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id),
    CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);

-- Add business_id to purchase_orders if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'business_id') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';
        UPDATE public.purchase_orders SET business_id = '550e8400-e29b-41d4-a716-446655440000' WHERE business_id IS NULL;
        ALTER TABLE public.purchase_orders ALTER COLUMN business_id SET NOT NULL;
    END IF;
END $$;

-- Create inventory_adjustments table
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    item_id uuid NOT NULL,
    previous_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    reason text NOT NULL CHECK (reason = ANY (ARRAY['damage'::text, 'counting_error'::text, 'return'::text, 'theft'::text, 'production'::text, 'other'::text])),
    notes text,
    created_by text,
    adjustment_date timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_adjustments_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id)
);

-- Insert sample inventory items for testing
INSERT INTO public.inventory_items (
    id, name, description, category, unit_of_measure, purchase_cost, selling_price, 
    current_stock, reorder_level, sku, is_active, business_id, is_website_item, 
    image_url, sale_price, weight, specifications
) VALUES 
(
    'c47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Gaming Mechanical Keyboard',
    'High-performance mechanical keyboard with RGB lighting',
    'Electronics',
    'pieces',
    60.00,
    99.99,
    30,
    5,
    'WEB-GMK-001',
    true,
    '550e8400-e29b-41d4-a716-446655440000',
    true,
    'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400',
    89.99,
    1.2,
    '{"features": ["RGB backlit keys", "Mechanical switches", "USB-C connection"], "compatibility": ["Windows", "Mac", "Linux"]}'::jsonb
),
(
    'c47ac10b-58cc-4372-a567-0e02b2c3d480',
    'Bluetooth Speaker',
    'Portable wireless speaker with deep bass',
    'Electronics', 
    'pieces',
    45.00,
    79.99,
    25,
    5,
    'WEB-BTS-001',
    true,
    '550e8400-e29b-41d4-a716-446655440000',
    true,
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    69.99,
    0.8,
    '{"features": ["Bluetooth 5.0", "12-hour battery", "Waterproof IPX7"], "connectivity": ["Bluetooth 5.0", "AUX input"]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_business_id ON public.inventory_items(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_website_item ON public.inventory_items(is_website_item);
CREATE INDEX IF NOT EXISTS idx_sales_orders_business_id ON public.sales_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON public.suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_business_id ON public.financial_transactions(business_id);

-- Create view for website products
CREATE OR REPLACE VIEW website_products AS
SELECT 
    id,
    name,
    description,
    image_url,
    selling_price,
    sale_price,
    current_stock,
    weight,
    specifications,
    is_featured,
    sku
FROM public.inventory_items 
WHERE is_website_item = true 
AND is_active = true 
AND current_stock > 0;

SELECT 'Database setup completed successfully!' as message;
SELECT 'Default business ID: 550e8400-e29b-41d4-a716-446655440000' as business_info;
SELECT 'All tables created/updated with proper business_id columns' as status;
SELECT 'Sample inventory items added for testing' as sample_data; 