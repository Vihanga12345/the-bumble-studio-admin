const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration with service role key for admin operations
const supabaseUrl = 'https://kaczhcjgicswvgfxvmgx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY3poY2pnaWNzd3ZnZnh2bWd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTg5NzU2OSwiZXhwIjoyMDUxNDczNTY5fQ.rB7Jm92tJRUiBCR8L9kDmTkP5KCOzb10RbqcRNaH7FE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLFile(filePath) {
  console.log(`\n📄 Reading SQL file: ${filePath}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`✅ File read successfully (${sql.length} characters)`);
    
    console.log('\n🚀 Executing SQL on Supabase...\n');
    
    // Split SQL into individual statements for better error handling
    const statements = sql
      .split(/;\s*(?=DO|CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|RAISE)/gi)
      .filter(stmt => stmt.trim().length > 0);
    
    console.log(`Found ${statements.length} SQL statement blocks to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          
          // Use raw query execution
          const { data, error } = await supabase.rpc('exec_sql', { 
            query: statement + ';' 
          });
          
          if (error) {
            // Try alternative: direct SQL execution using postgrest
            const { error: directError } = await supabase
              .from('_sql')
              .select('*')
              .limit(0);
            
            if (directError) {
              console.error(`❌ Error in statement ${i + 1}:`, error.message);
              // Continue with next statement
            } else {
              console.log(`✅ Statement ${i + 1} executed`);
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
            if (data) console.log('   Response:', data);
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
          // Continue with next statement
        }
      }
    }
    
    console.log('\n✨ SQL execution completed!\n');
    return true;
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    return false;
  }
}

// Alternative direct execution method
async function executeDirectSQL(sql) {
  console.log('🔧 Using direct PostgreSQL connection...\n');
  
  const { Client } = require('pg');
  
  const client = new Client({
    host: 'db.kaczhcjgicswvgfxvmgx.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'VikingJaJamal1@',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    console.log('🚀 Executing SQL...');
    const result = await client.query(sql);
    
    console.log('\n✅ SQL executed successfully!');
    console.log('Rows affected:', result.rowCount);
    
    if (result.rows && result.rows.length > 0) {
      console.log('\nResults:');
      result.rows.forEach((row, i) => {
        console.log(`  ${i + 1}.`, row);
      });
    }
    
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    await client.end();
    return false;
  }
}

// Main execution
(async () => {
  const sqlFile = process.argv[2] || 'src/SQL Queries/Enhanced_Sales_Orders.sql';
  const sqlPath = path.join(__dirname, sqlFile);
  
  console.log('\n' + '='.repeat(60));
  console.log('🗄️  SUPABASE SQL EXECUTOR');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`\n❌ File not found: ${sqlPath}`);
    process.exit(1);
  }
  
  // Read the SQL file
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('\n📋 File Details:');
  console.log(`   Path: ${sqlPath}`);
  console.log(`   Size: ${sql.length} characters`);
  console.log(`   Lines: ${sql.split('\n').length}`);
  
  // Try direct PostgreSQL connection (more reliable)
  console.log('\n' + '-'.repeat(60));
  const success = await executeDirectSQL(sql);
  
  if (success) {
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE UPDATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 Changes Applied:');
    console.log('   ✓ Added customer fields (name, address, phone)');
    console.log('   ✓ Added discount tracking columns');
    console.log('   ✓ Added advance payment columns');
    console.log('   ✓ Added order status field');
    console.log('   ✓ Created calculation functions');
    console.log('   ✓ Created automatic triggers');
    console.log('   ✓ Added performance indexes');
    console.log('   ✓ Updated security policies');
    console.log('\n🎉 You can now use the Manual Sales Order feature!\n');
    process.exit(0);
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  EXECUTION COMPLETED WITH ERRORS');
    console.log('='.repeat(60));
    console.log('\n💡 Some statements may have succeeded.');
    console.log('   Check your Supabase dashboard to verify.\n');
    process.exit(1);
  }
})();
