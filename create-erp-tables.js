import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgdfjcodbzpkjlgnjxrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZGZqY29kYnpwa2psZ25qeHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjMzMTcsImV4cCI6MjA2NDc5OTMxN30.ncNyyT8_Os5PvlSU8Cfo0QreWnQmL73ei_K_bGALY-c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createERPTables() {
  console.log('Creating ERP authentication tables...');

  try {
    // 1. Create ERP Users table
    console.log('Creating erp_users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (usersError) {
      console.log('Note: erp_users table might already exist or SQL execution not available');
      console.log('Creating tables using direct INSERT method...');
    }

    // Try alternative approach - check if table exists
    const { data: tableCheck, error: checkError } = await supabase
      .from('erp_users')
      .select('id')
      .limit(1);

    if (checkError) {
      console.log('Tables need to be created manually in Supabase dashboard');
      console.log('Please run these SQL commands in your Supabase SQL Editor:');
      
      console.log(`
-- 1. Create ERP Users table
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

-- 2. Create ERP Modules table
CREATE TABLE IF NOT EXISTS public.erp_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name VARCHAR(50) UNIQUE NOT NULL,
  module_key VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create User Module Permissions table
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

-- 4. Create ERP Sessions table
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

-- 5. Insert default modules
INSERT INTO public.erp_modules (module_name, module_key, description, icon) VALUES
('Sales', 'sales', 'Sales management and customer relations', 'ShoppingCart'),
('Inventory', 'inventory', 'Inventory and stock management', 'Package'),
('Procurement', 'procurement', 'Purchasing and supplier management', 'Truck'),
('Finance', 'finance', 'Financial management and accounting', 'DollarSign')
ON CONFLICT (module_key) DO NOTHING;

-- 6. Create default admin user (password: admin123)
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
  'ba3253876aed6bc22d4a6ff53d8406c6ad864195ed144ab5c87621b6c233b548baeae6956df346ec8c17f5ea10f35ee3cbc514797ed7ddd3145464e2a0bab413',
  'System',
  'Administrator',
  'manager'
) ON CONFLICT (username) DO NOTHING;

-- 7. Grant all module access to admin
DO $$
DECLARE
    manager_id UUID;
    module_rec RECORD;
BEGIN
    SELECT id INTO manager_id FROM public.erp_users WHERE username = 'admin' LIMIT 1;
    
    IF manager_id IS NOT NULL THEN
        FOR module_rec IN SELECT id FROM public.erp_modules WHERE is_active = true
        LOOP
            INSERT INTO public.user_module_permissions (user_id, module_id, has_access, granted_by)
            VALUES (manager_id, module_rec.id, true, manager_id)
            ON CONFLICT (user_id, module_id) DO NOTHING;
        END LOOP;
    END IF;
END
$$;

-- 8. Create functions for permission management
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
    SELECT id INTO v_module_id FROM public.erp_modules WHERE module_key = p_module_key;
    
    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module not found: %', p_module_key;
    END IF;
    
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
    SELECT id INTO v_module_id FROM public.erp_modules WHERE module_key = p_module_key;
    
    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module not found: %', p_module_key;
    END IF;
    
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
      `);
      
      return;
    }

    console.log('ERP tables already exist or were created successfully!');
    
    // Check if admin user exists
    const { data: adminUser } = await supabase
      .from('erp_users')
      .select('username')
      .eq('username', 'admin')
      .single();

    if (!adminUser) {
      console.log('Creating admin user...');
      const { error: adminError } = await supabase
        .from('erp_users')
        .insert({
          username: 'admin',
          email: 'admin@company.com',
          password_hash: 'ba3253876aed6bc22d4a6ff53d8406c6ad864195ed144ab5c87621b6c233b548baeae6956df346ec8c17f5ea10f35ee3cbc514797ed7ddd3145464e2a0bab413',
          first_name: 'System',
          last_name: 'Administrator',
          role: 'manager'
        });

      if (adminError) {
        console.error('Error creating admin user:', adminError.message);
      } else {
        console.log('Admin user created successfully!');
      }
    } else {
      console.log('Admin user already exists');
    }

  } catch (error) {
    console.error('Error creating ERP tables:', error);
    console.log('\nPlease manually run the SQL commands shown above in your Supabase dashboard');
  }
}

// Run the script
createERPTables().then(() => {
  console.log('\n=== ERP SETUP COMPLETE ===');
  console.log('Login credentials:');
  console.log('Username: admin');
  console.log('Password: admin123');
  console.log('==========================');
}); 