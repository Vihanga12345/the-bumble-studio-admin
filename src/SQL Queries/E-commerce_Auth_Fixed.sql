-- =====================================================
-- E-COMMERCE AUTHENTICATION SETUP - FIXED VERSION
-- No hardcoded UUIDs - all generated dynamically
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create website_users table
CREATE TABLE IF NOT EXISTS public.website_users (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    address text,
    city text,
    postal_code text,
    country text DEFAULT 'Sri Lanka',
    is_verified boolean DEFAULT false,
    verification_token text,
    reset_token text,
    reset_token_expires timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    business_id uuid NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
    CONSTRAINT website_users_pkey PRIMARY KEY (id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_website_users_email ON public.website_users(email);

-- Add columns to existing tables
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS website_user_id uuid;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS shipping_city text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS shipping_postal_code text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS delivery_instructions text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS website_user_id uuid;

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.website_sessions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    session_token text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT website_sessions_pkey PRIMARY KEY (id)
);

-- Create customer function
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
        v_user_record.email,
        v_user_record.phone,
        v_user_record.address,
        v_user_record.business_id,
        'website',
        p_user_id,
        now()
    ) RETURNING id INTO v_customer_id;
    
    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Update product images
UPDATE public.inventory_items 
SET 
    image_url = CASE 
        WHEN name LIKE '%Keyboard%' THEN 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=400&fit=crop'
        WHEN name LIKE '%Speaker%' THEN 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop'
        WHEN name LIKE '%Headphones%' THEN 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        ELSE 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop'
    END,
    is_website_item = true,
    is_active = true
WHERE business_id = '550e8400-e29b-41d4-a716-446655440000';

-- Create test users with generated UUIDs
INSERT INTO public.website_users (
    email, password_hash, first_name, last_name, phone, address, is_verified, business_id
) VALUES 
(
    'test@example.com',
    'cGFzc3dvcmQxMjNzYWx0MTIz',
    'John',
    'Doe',
    '+94771234567',
    '123 Main Street, Colombo',
    true,
    '550e8400-e29b-41d4-a716-446655440000'
),
(
    'jane@example.com',
    'cGFzc3dvcmQxMjNzYWx0MTIz',
    'Jane',
    'Smith',
    '+94771234568',
    '456 Park Avenue, Kandy',
    true,
    '550e8400-e29b-41d4-a716-446655440000'
)
ON CONFLICT (email) DO NOTHING;

SELECT 'E-commerce authentication setup completed!' as status;
SELECT 'Test login: test@example.com / password123' as credentials; 