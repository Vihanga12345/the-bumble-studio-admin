-- =====================================================
-- COMPLETE AUTHENTICATION SETUP
-- E-commerce Supabase Auth + ERP Custom Auth System
-- =====================================================

-- =====================================================
-- 1. E-COMMERCE AUTHENTICATION (Simplified Setup)
-- =====================================================

-- Create website_users table for e-commerce users (simplified without Supabase auth dependency)
CREATE TABLE IF NOT EXISTS public.website_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Sri Lanka',
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for website_users
CREATE INDEX IF NOT EXISTS idx_website_users_username ON public.website_users(username);
CREATE INDEX IF NOT EXISTS idx_website_users_email ON public.website_users(email);
CREATE INDEX IF NOT EXISTS idx_website_users_active ON public.website_users(is_active);

-- Create website sessions table for session management
CREATE TABLE IF NOT EXISTS public.website_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.website_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for website_sessions
CREATE INDEX IF NOT EXISTS idx_website_sessions_user_id ON public.website_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_website_sessions_token ON public.website_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_website_sessions_expires_at ON public.website_sessions(expires_at);

-- =====================================================
-- 2. ERP CUSTOM AUTHENTICATION SYSTEM
-- =====================================================

-- Create ERP users table (independent of Supabase auth)
CREATE TABLE IF NOT EXISTS public.erp_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Will store bcrypt hashed passwords
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('manager', 'employee')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.erp_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for erp_users
CREATE INDEX IF NOT EXISTS idx_erp_users_username ON public.erp_users(username);
CREATE INDEX IF NOT EXISTS idx_erp_users_email ON public.erp_users(email);
CREATE INDEX IF NOT EXISTS idx_erp_users_role ON public.erp_users(role);

-- Create ERP modules table
CREATE TABLE IF NOT EXISTS public.erp_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name VARCHAR(50) UNIQUE NOT NULL,
    module_key VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default ERP modules
INSERT INTO public.erp_modules (module_name, module_key, description, icon) VALUES
('Sales', 'sales', 'Sales management and customer relations', 'ShoppingCart'),
('Inventory', 'inventory', 'Inventory and stock management', 'Package'),
('Procurement', 'procurement', 'Purchasing and supplier management', 'Truck'),
('Finance', 'finance', 'Financial management and accounting', 'DollarSign')
ON CONFLICT (module_key) DO NOTHING;

-- Create user module permissions table
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.erp_users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.erp_modules(id) ON DELETE CASCADE,
    has_access BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES public.erp_users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_id)
);

-- Create indexes for user_module_permissions
CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user_id ON public.user_module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_permissions_module_id ON public.user_module_permissions(module_id);

-- Create ERP sessions table for login tracking
CREATE TABLE IF NOT EXISTS public.erp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.erp_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for erp_sessions
CREATE INDEX IF NOT EXISTS idx_erp_sessions_user_id ON public.erp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_erp_sessions_token ON public.erp_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_erp_sessions_expires_at ON public.erp_sessions(expires_at);

-- =====================================================
-- 3. UPDATE EXISTING TABLES FOR AUTHENTICATION
-- =====================================================

-- Add website_user_id to sales_orders for e-commerce orders
ALTER TABLE public.sales_orders 
ADD COLUMN IF NOT EXISTS website_user_id UUID REFERENCES public.website_users(id);

-- Add erp_user_id for ERP orders
ALTER TABLE public.sales_orders 
ADD COLUMN IF NOT EXISTS created_by_erp_user UUID REFERENCES public.erp_users(id);

-- Update purchase_orders to track ERP user
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS created_by_erp_user UUID REFERENCES public.erp_users(id);

-- Update inventory_items to track ERP user
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS created_by_erp_user UUID REFERENCES public.erp_users(id);

-- =====================================================
-- 4. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create default manager user (run once)
CREATE OR REPLACE FUNCTION create_default_manager()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    manager_id UUID;
    module_rec RECORD;
BEGIN
    -- Check if manager already exists
    SELECT id INTO manager_id FROM public.erp_users WHERE role = 'manager' LIMIT 1;
    
    IF manager_id IS NULL THEN
        -- Create default manager (password: admin123 - simple hash for demo)
        INSERT INTO public.erp_users (
            username, 
            email, 
            password_hash, 
            first_name, 
            last_name, 
            role
        ) VALUES (
            'admin',
            'admin@company.com',
            'admin123_hash', -- Simple hash for demo - replace with proper bcrypt
            'System',
            'Administrator',
            'manager'
        ) RETURNING id INTO manager_id;
        
        -- Grant all module access to manager
        FOR module_rec IN SELECT id FROM public.erp_modules WHERE is_active = true
        LOOP
            INSERT INTO public.user_module_permissions (user_id, module_id, has_access, granted_by)
            VALUES (manager_id, module_rec.id, true, manager_id);
        END LOOP;
    END IF;
    
    RETURN manager_id;
END;
$$;

-- Function to grant module access to user
CREATE OR REPLACE FUNCTION grant_module_access(
    p_user_id UUID,
    p_module_key VARCHAR(50),
    p_granted_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_module_id UUID;
BEGIN
    -- Get module ID
    SELECT id INTO v_module_id FROM public.erp_modules WHERE module_key = p_module_key;
    
    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module not found: %', p_module_key;
    END IF;
    
    -- Insert or update permission
    INSERT INTO public.user_module_permissions (user_id, module_id, has_access, granted_by)
    VALUES (p_user_id, v_module_id, true, p_granted_by)
    ON CONFLICT (user_id, module_id) 
    DO UPDATE SET 
        has_access = true,
        granted_by = p_granted_by,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$;

-- Function to revoke module access
CREATE OR REPLACE FUNCTION revoke_module_access(
    p_user_id UUID,
    p_module_key VARCHAR(50),
    p_granted_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_module_id UUID;
BEGIN
    -- Get module ID
    SELECT id INTO v_module_id FROM public.erp_modules WHERE module_key = p_module_key;
    
    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module not found: %', p_module_key;
    END IF;
    
    -- Update permission
    INSERT INTO public.user_module_permissions (user_id, module_id, has_access, granted_by)
    VALUES (p_user_id, v_module_id, false, p_granted_by)
    ON CONFLICT (user_id, module_id) 
    DO UPDATE SET 
        has_access = false,
        granted_by = p_granted_by,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_module_permissions(p_user_id UUID)
RETURNS TABLE(
    module_key VARCHAR(50),
    module_name VARCHAR(50),
    has_access BOOLEAN,
    icon VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.module_key,
        m.module_name,
        COALESCE(p.has_access, false) as has_access,
        m.icon
    FROM public.erp_modules m
    LEFT JOIN public.user_module_permissions p ON m.id = p.module_id AND p.user_id = p_user_id
    WHERE m.is_active = true
    ORDER BY m.module_name;
END;
$$;

-- =====================================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for website_users
DROP TRIGGER IF EXISTS update_website_users_updated_at ON public.website_users;
CREATE TRIGGER update_website_users_updated_at 
    BEFORE UPDATE ON public.website_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for erp_users
DROP TRIGGER IF EXISTS update_erp_users_updated_at ON public.erp_users;
CREATE TRIGGER update_erp_users_updated_at 
    BEFORE UPDATE ON public.erp_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_module_permissions
DROP TRIGGER IF EXISTS update_user_module_permissions_updated_at ON public.user_module_permissions;
CREATE TRIGGER update_user_module_permissions_updated_at 
    BEFORE UPDATE ON public.user_module_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CREATE SAMPLE E-COMMERCE USER
-- =====================================================

-- Create sample e-commerce user for testing
INSERT INTO public.website_users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    phone, 
    address, 
    city, 
    state, 
    postal_code,
    is_active,
    email_verified
) VALUES (
    'testuser',
    'test@example.com',
    'password123_hash', -- Simple hash for demo
    'John',
    'Doe',
    '+94712345678',
    '123 Main Street',
    'Colombo',
    'Western Province',
    '10001',
    true,
    true
) ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- 7. INITIALIZE DEFAULT DATA
-- =====================================================

-- Create default manager user
SELECT create_default_manager() as default_manager_created;

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

SELECT 'Authentication setup completed successfully!' as status;

-- Show created tables
SELECT 'Created tables:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('website_users', 'website_sessions', 'erp_users', 'erp_modules', 'user_module_permissions', 'erp_sessions');

-- Show default manager
SELECT 'Default ERP manager user:' as info;
SELECT username, email, role, created_at FROM public.erp_users WHERE role = 'manager';

-- Show sample e-commerce user
SELECT 'Sample e-commerce user:' as info;
SELECT username, email, first_name, last_name FROM public.website_users LIMIT 1;

-- Show ERP modules
SELECT 'Available ERP modules:' as info;
SELECT module_name, module_key, icon FROM public.erp_modules WHERE is_active = true;

SELECT 'Setup complete! ERP Login: admin / admin123 | E-commerce Login: testuser / password123' as login_info; 