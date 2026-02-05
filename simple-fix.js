import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgdfjcodbzpkjlgnjxrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZGZqY29kYnpwa2psZ25qeHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjMzMTcsImV4cCI6MjA2NDc5OTMxN30.ncNyyT8_Os5PvlSU8Cfo0QreWnQmL73ei_K_bGALY-c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDatabase() {
  try {
    console.log('Connecting to Supabase...');

    // Check if table exists by trying to select from it
    const { data, error } = await supabase
      .from('website_users')
      .select('*')
      .limit(1);

    if (error && error.message.includes('relation "public.website_users" does not exist')) {
      console.log('Creating website_users table...');
      
      // We can't create tables directly with the client, so let's try with rpc
      console.log('Table needs to be created manually in Supabase dashboard');
      return;
    }

    console.log('Table exists, checking for missing columns...');

    // Try inserting a test user to see what columns are missing
    const testUser = {
      email: 'test@example.com',
      username: 'testuser',
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
    };

    const { data: insertData, error: insertError } = await supabase
      .from('website_users')
      .insert(testUser)
      .select();

    if (insertError) {
      console.error('Error creating test user (this shows what columns are missing):', insertError.message);
      
      // Try with just basic columns
      console.log('Trying with basic columns only...');
      const basicUser = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      const { data: basicData, error: basicError } = await supabase
        .from('website_users')
        .insert(basicUser)
        .select();

      if (basicError) {
        console.error('Error with basic user:', basicError.message);
      } else {
        console.log('Basic user created:', basicData);
      }
    } else {
      console.log('Test user created successfully:', insertData);
    }

  } catch (error) {
    console.error('Error fixing database:', error);
  }
}

fixDatabase(); 