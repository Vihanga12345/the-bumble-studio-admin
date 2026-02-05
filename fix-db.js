import { supabase } from './src/integrations/supabase/client.ts';

async function fixDatabase() {
  try {
    console.log('Connecting to Supabase...');

    // First, let's check if the website_users table exists and what columns it has
    const { data: tableInfo, error: tableError } = await supabase
      .from('website_users')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('website_users table might not exist, creating it...');
      
      // Create the table using raw SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.website_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(100) UNIQUE,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          first_name VARCHAR(100),
          last_name VARCHAR(100),
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
      `;

      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('Error creating table:', createError);
        return;
      }
      
      console.log('Table created successfully');
    } else {
      console.log('website_users table exists');
    }

    // Add missing columns one by one
    const columnsToAdd = [
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS username VARCHAR(100)',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)', 
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS address TEXT',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS city VARCHAR(100)',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS state VARCHAR(100)',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT \'Sri Lanka\'',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true',
      'ALTER TABLE public.website_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false'
    ];

    for (const sql of columnsToAdd) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.error(`Error executing: ${sql}`, error);
        } else {
          console.log(`Successfully executed: ${sql}`);
        }
      } catch (err) {
        console.error(`Failed to execute: ${sql}`, err);
      }
    }

    // Create a test user
    console.log('Creating test user...');
    const { data: insertData, error: insertError } = await supabase
      .from('website_users')
      .insert({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'password123_hash',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+94712345678',
        address: '123 Main Street',
        city: 'Colombo',
        state: 'Western Province',
        postal_code: '10001',
        is_active: true,
        email_verified: true
      })
      .select();

    if (insertError) {
      console.error('Error creating test user:', insertError);
    } else {
      console.log('Test user created successfully:', insertData);
    }

  } catch (error) {
    console.error('Error fixing database:', error);
  }
}

fixDatabase(); 