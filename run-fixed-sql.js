import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zgdfjcodbzpkjlgnjxrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZGZqY29kYnpwa2psZ25qeHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjMzMTcsImV4cCI6MjA2NDc5OTMxN30.ncNyyT8_Os5PvlSU8Cfo0QreWnQmL73ei_K_bGALY-c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFixedSQL() {
  try {
    console.log('Reading the fixed SQL file...');
    
    const sqlContent = fs.readFileSync('Quick_Fix_Schema.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(/(?:^|\n)(?=(?:DO \$\$|SELECT|--))/)
      .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
      .map(stmt => stmt.trim());

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements
      
      console.log(`\nExecuting statement ${i + 1}...`);
      console.log(`Statement preview: ${statement.substring(0, 100)}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        });
        
        if (error) {
          console.error(`Error in statement ${i + 1}:`, error.message);
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`);
          if (data) {
            console.log('Result:', data);
          }
        }
      } catch (err) {
        console.error(`Exception in statement ${i + 1}:`, err.message);
      }
    }

    console.log('\n=== TESTING LOGIN ===');
    // Test if our test user can login
    const { data: users, error: loginError } = await supabase
      .from('website_users')
      .select('*')
      .eq('email', 'testuser@example.com')
      .eq('password_hash', 'password123_hash')
      .limit(1);

    if (loginError) {
      console.error('Login test error:', loginError.message);
    } else if (users && users.length > 0) {
      console.log('✓ Test user login works!');
      console.log('User data:', {
        id: users[0].id,
        email: users[0].email,
        name: `${users[0].first_name} ${users[0].last_name}`,
        username: users[0].username,
        is_active: users[0].is_active
      });
    } else {
      console.log('❌ Test user login failed - user not found');
    }

  } catch (error) {
    console.error('Error running SQL fix:', error);
  }
}

runFixedSQL(); 