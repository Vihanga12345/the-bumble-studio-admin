-- =====================================================
-- FIX AUTHENTICATION SCHEMA
-- Add missing columns and tables for authentication
-- =====================================================

-- =====================================================
-- 1. FIX WEBSITE_USERS TABLE
-- =====================================================

-- Check if website_users table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'website_users') THEN
        CREATE TABLE public.website_users (
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
    END IF;
END
$$;

-- Add missing columns to existing website_users table if they don't exist
DO $$
BEGIN
    -- Add username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'username') THEN
        ALTER TABLE public.website_users ADD COLUMN username VARCHAR(100);
        -- Update existing records with a default username based on email
        UPDATE public.website_users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
        ALTER TABLE public.website_users ALTER COLUMN username SET NOT NULL;
        ALTER TABLE public.website_users ADD CONSTRAINT website_users_username_key UNIQUE (username);
    END IF;

    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'password_hash') THEN
        ALTER TABLE public.website_users ADD COLUMN password_hash VARCHAR(255);
        -- Set default password hash for existing records
        UPDATE public.website_users SET password_hash = 'password123_hash' WHERE password_hash IS NULL;
        ALTER TABLE public.website_users ALTER COLUMN password_hash SET NOT NULL;
    END IF;

    -- Add email_verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'email_verified') THEN
        ALTER TABLE public.website_users ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;

    -- Add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'phone') THEN
        ALTER TABLE public.website_users ADD COLUMN phone VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'address') THEN
        ALTER TABLE public.website_users ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'city') THEN
        ALTER TABLE public.website_users ADD COLUMN city VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'state') THEN
        ALTER TABLE public.website_users ADD COLUMN state VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'postal_code') THEN
        ALTER TABLE public.website_users ADD COLUMN postal_code VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'country') THEN
        ALTER TABLE public.website_users ADD COLUMN country VARCHAR(100) DEFAULT 'Sri Lanka';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'date_of_birth') THEN
        ALTER TABLE public.website_users ADD COLUMN date_of_birth DATE;
    END IF;
END
$$;

-- Create indexes for website_users
CREATE INDEX IF NOT EXISTS idx_website_users_username ON public.website_users(username);
CREATE INDEX IF NOT EXISTS idx_website_users_email ON public.website_users(email);
CREATE INDEX IF NOT EXISTS idx_website_users_active ON public.website_users(is_active);

-- =====================================================
-- 2. CREATE WEBSITE_SESSIONS TABLE
-- =====================================================

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
-- 3. CREATE ERP AUTHENTICATION TABLES
-- =====================================================

-- Create ERP users table
CREATE TABLE IF NOT EXISTS public.erp_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
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

-- Create ERP sessions table
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

-- Function to grant module access
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

-- =====================================================
-- 5. CREATE TRIGGERS
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

-- =====================================================
-- 6. CREATE DEFAULT USERS
-- =====================================================

-- Create sample e-commerce user
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
    'password123_hash',
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

-- Create default ERP manager user
DO $$
DECLARE
    manager_id UUID;
    module_rec RECORD;
BEGIN
    -- Check if manager already exists
    SELECT id INTO manager_id FROM public.erp_users WHERE username = 'admin' LIMIT 1;
    
    IF manager_id IS NULL THEN
        -- Create default manager
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
            'admin123_hash',
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
END
$$;

-- =====================================================
-- 7. UPDATE EXISTING TABLES
-- =====================================================

-- Add foreign key columns to existing tables if they don't exist
DO $$
BEGIN
    -- Add website_user_id to sales_orders
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'website_user_id') THEN
            ALTER TABLE public.sales_orders ADD COLUMN website_user_id UUID REFERENCES public.website_users(id);
        END IF;
    END IF;

    -- Add created_by_erp_user to sales_orders
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'created_by_erp_user') THEN
            ALTER TABLE public.sales_orders ADD COLUMN created_by_erp_user UUID REFERENCES public.erp_users(id);
        END IF;
    END IF;

    -- Add created_by_erp_user to purchase_orders if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'created_by_erp_user') THEN
            ALTER TABLE public.purchase_orders ADD COLUMN created_by_erp_user UUID REFERENCES public.erp_users(id);
        END IF;
    END IF;

    -- Add created_by_erp_user to inventory_items if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'created_by_erp_user') THEN
            ALTER TABLE public.inventory_items ADD COLUMN created_by_erp_user UUID REFERENCES public.erp_users(id);
        END IF;
    END IF;
END
$$;

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

SELECT 'Authentication schema fix completed successfully!' as status;

-- Show sample users
SELECT 'Sample e-commerce user:' as info;
SELECT username, email, first_name, last_name FROM public.website_users LIMIT 1;

SELECT 'Sample ERP manager:' as info;
SELECT username, email, role, first_name, last_name FROM public.erp_users WHERE role = 'manager' LIMIT 1;

SELECT 'Available modules:' as info;
SELECT module_name, module_key FROM public.erp_modules WHERE is_active = true;

SELECT 'Ready to test! E-commerce: testuser/password123 | ERP: admin/admin123' as login_info; 