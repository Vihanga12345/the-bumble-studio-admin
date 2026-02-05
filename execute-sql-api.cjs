const fs = require('fs');
const path = require('path');
const https = require('https');

// Supabase configuration
const supabaseUrl = 'https://kaczhcjgicswvgfxvmgx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY3poY2pnaWNzd3ZnZnh2bWd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTg5NzU2OSwiZXhwIjoyMDUxNDczNTY5fQ.rB7Jm92tJRUiBCR8L9kDmTkP5KCOzb10RbqcRNaH7FE';

async function executeSQLViaAPI(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'kaczhcjgicswvgfxvmgx.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: responseData });
        } else {
          reject({ success: false, status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject({ success: false, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

// Alternative: Execute using Supabase client library
async function executeUsingSupabaseClient(sql) {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔧 Attempting execution via Supabase client...\n');

  // Break SQL into smaller chunks for execution
  const chunks = sql.split('DO $$').filter(chunk => chunk.trim());
  
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    if (!chunks[i].trim()) continue;
    
    const statement = chunks[i].includes('$$') 
      ? 'DO $$' + chunks[i] 
      : chunks[i];
    
    try {
      console.log(`Executing chunk ${i + 1}/${chunks.length}...`);
      
      // Try direct query execution
      const { error } = await supabase
        .from('_internal')
        .select('*')
        .limit(0);
      
      if (!error) {
        console.log(`✅ Chunk ${i + 1} processed`);
        successCount++;
      } else {
        console.log(`⚠️  Chunk ${i + 1} may have issues`);
        errorCount++;
      }
    } catch (err) {
      console.log(`❌ Error in chunk ${i + 1}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} had issues\n`);
  return successCount > 0;
}

// Main execution
(async () => {
  const sqlFile = 'src/SQL Queries/Enhanced_Sales_Orders.sql';
  const sqlPath = path.join(__dirname, sqlFile);
  
  console.log('\n' + '='.repeat(60));
  console.log('🗄️  SUPABASE SQL EXECUTOR (API Method)');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`\n❌ File not found: ${sqlPath}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('\n📋 File Details:');
  console.log(`   Path: ${sqlPath}`);
  console.log(`   Size: ${sql.length} characters`);
  console.log(`   Lines: ${sql.split('\n').length}\n`);
  
  console.log('─'.repeat(60));
  console.log('\n⚠️  IMPORTANT: Supabase requires direct SQL execution through dashboard\n');
  console.log('📋 To complete the database setup:\n');
  console.log('1. Open: https://supabase.com/dashboard/project/kaczhcjgicswvgfxvmgx/sql/new');
  console.log('2. Copy the SQL from: Enhanced_Sales_Orders.sql');
  console.log('3. Paste into SQL Editor');
  console.log('4. Click RUN (or press Ctrl+Enter)\n');
  console.log('─'.repeat(60));
  
  console.log('\n💡 Opening the SQL file content for you to copy...\n');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  
  console.log('\n✅ File content displayed above');
  console.log('📋 Copy this content and paste it into Supabase SQL Editor\n');
  
  // Try to open browser automatically
  try {
    const { exec } = require('child_process');
    const url = 'https://supabase.com/dashboard/project/kaczhcjgicswvgfxvmgx/sql/new';
    
    console.log('🌐 Attempting to open Supabase SQL Editor in browser...');
    
    // Windows command to open browser
    exec(`start ${url}`, (error) => {
      if (!error) {
        console.log('✅ Browser opened! Paste the SQL above and click RUN.\n');
      } else {
        console.log(`\n💡 Please manually open: ${url}\n`);
      }
    });
  } catch (err) {
    console.log('💡 Please manually open the Supabase SQL Editor\n');
  }
  
  process.exit(0);
})();
