import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgdfjcodbzpkjlgnjxrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZGZqY29kYnpwa2psZ25qeHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjMzMTcsImV4cCI6MjA2NDc5OTMxN30.ncNyyT8_Os5PvlSU8Cfo0QreWnQmL73ei_K_bGALY-c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  try {
    console.log('Creating test user with existing schema...');

    // Create a user with all the required fields that exist
    const testUser = {
      email: 'testuser@example.com',
      password_hash: 'password123_hash', // In production, use proper hashing
      first_name: 'John',
      last_name: 'Doe',
      phone: '+94712345678',
      address: '123 Main Street',
      city: 'Colombo',
      postal_code: '10001'
    };

    console.log('Inserting user:', testUser);
    const { data, error } = await supabase
      .from('website_users')
      .insert(testUser)
      .select();

    if (error) {
      console.error('Error creating test user:', error.message);
    } else {
      console.log('Test user created successfully:', data);
      console.log('\n=== USER CREDENTIALS ===');
      console.log('Email: testuser@example.com');
      console.log('Password: password123');
      console.log('=======================\n');
    }

    // Also check what users currently exist
    console.log('Current users in database:');
    const { data: existingUsers, error: fetchError } = await supabase
      .from('website_users')
      .select('id, email, first_name, last_name')
      .limit(5);

    if (fetchError) {
      console.error('Error fetching users:', fetchError.message);
    } else {
      console.table(existingUsers);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUser(); 