-- REMOVE ALL RLS RESTRICTIONS FROM DATABASE
-- WARNING: This removes all security policies - use only for development/testing

-- ============================================================================
-- PART 1: DISABLE RLS ON ALL PUBLIC TABLES
-- ============================================================================

-- Disable RLS on all main tables
ALTER TABLE IF EXISTS public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.website_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.goods_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.item_links DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Drop all policies on all tables (this will work even if they don't exist)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- PART 3: GRANT FULL PERMISSIONS TO ALL ROLES
-- ============================================================================

-- Grant all permissions on all tables to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant all permissions to anon users (public access)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Grant all permissions to postgres role
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- ============================================================================
-- PART 4: STORAGE BUCKET - UNRESTRICTED ACCESS
-- ============================================================================

-- Create product-images bucket if it doesn't exist (public, no restrictions)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images', 
    'product-images', 
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Drop all existing storage policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- Create simple, permissive policies for storage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can do anything" ON storage.objects;

-- Allow anyone to do anything with storage objects
CREATE POLICY "Public Access"
ON storage.objects
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PART 5: CREATE PERMISSIVE POLICIES (OPTIONAL - FOR BASIC STRUCTURE)
-- ============================================================================

-- Create wide-open policies for key tables (anyone can do anything)

-- Inventory Items
DROP POLICY IF EXISTS "Allow all on inventory_items" ON public.inventory_items;
CREATE POLICY "Allow all on inventory_items"
ON public.inventory_items
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Sales Orders
DROP POLICY IF EXISTS "Allow all on sales_orders" ON public.sales_orders;
CREATE POLICY "Allow all on sales_orders"
ON public.sales_orders
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Purchase Orders
DROP POLICY IF EXISTS "Allow all on purchase_orders" ON public.purchase_orders;
CREATE POLICY "Allow all on purchase_orders"
ON public.purchase_orders
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Customers
DROP POLICY IF EXISTS "Allow all on customers" ON public.customers;
CREATE POLICY "Allow all on customers"
ON public.customers
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Suppliers
DROP POLICY IF EXISTS "Allow all on suppliers" ON public.suppliers;
CREATE POLICY "Allow all on suppliers"
ON public.suppliers
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- ERP Users
DROP POLICY IF EXISTS "Allow all on erp_users" ON public.erp_users;
CREATE POLICY "Allow all on erp_users"
ON public.erp_users
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Website Users
DROP POLICY IF EXISTS "Allow all on website_users" ON public.website_users;
CREATE POLICY "Allow all on website_users"
ON public.website_users
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PART 6: ENSURE STORAGE PERMISSIONS
-- ============================================================================

-- Grant storage permissions to all roles
GRANT ALL ON storage.objects TO public;
GRANT ALL ON storage.buckets TO public;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO anon;

-- ============================================================================
-- SUCCESS - ALL RESTRICTIONS REMOVED
-- ============================================================================
-- All RLS policies have been removed or set to unrestricted
-- All tables now allow full access to all users
-- Storage bucket allows anyone to upload/view/delete
-- No authentication or authorization checks
