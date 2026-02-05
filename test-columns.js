import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgdfjcodbzpkjlgnjxrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZGZqY29kYnpwa2psZ25qeHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjMzMTcsImV4cCI6MjA2NDc5OTMxN30.ncNyyT8_Os5PvlSU8Cfo0QreWnQmL73ei_K_bGALY-c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumns() {
  try {
    console.log('Testing what columns exist in website_users table...');

    // Try with minimal required fields first
    const minimalUser = {
      email: 'test' + Date.now() + '@example.com',
      password_hash: 'password123_hash'
    };

    console.log('Trying with minimal user:', minimalUser);
    const { data: minimalData, error: minimalError } = await supabase
      .from('website_users')
      .insert(minimalUser)
      .select();

    if (minimalError) {
      console.error('Minimal user error:', minimalError.message);
    } else {
      console.log('Minimal user created successfully:', minimalData);
    }

    // Test adding one field at a time
    const testFields = [
      { username: 'testuser' + Date.now() },
      { first_name: 'John' },
      { last_name: 'Doe' },
      { phone: '+94712345678' },
      { address: '123 Main Street' },
      { city: 'Colombo' },
      { state: 'Western Province' },
      { postal_code: '10001' },
      { is_active: true }
    ];

    for (const field of testFields) {
      const testUser = {
        email: 'test' + Date.now() + Math.random() + '@example.com',
        password_hash: 'password123_hash',
        ...field
      };

      console.log(`Testing field: ${Object.keys(field)[0]}`);
      const { data, error } = await supabase
        .from('website_users')
        .insert(testUser)
        .select();

      if (error) {
        console.error(`Field ${Object.keys(field)[0]} error:`, error.message);
      } else {
        console.log(`Field ${Object.keys(field)[0]} works!`);
      }
    }

  } catch (error) {
    console.error('Error testing columns:', error);
  }
}

testColumns(); 