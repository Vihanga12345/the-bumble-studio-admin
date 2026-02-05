const fs = require('fs');
const path = require('path');

async function pushToSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  
  // Read SQL
  const sqlPath = path.join(__dirname, 'src/SQL Queries/Ensure_Variant_Columns.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('\n' + '='.repeat(70));
  console.log('🗄️  PUSHING SQL TO SUPABASE DATABASE');
  console.log('='.repeat(70));
  console.log('\n📄 SQL File: Ensure_Variant_Columns.sql\n');
  
  // Use service role key
  const supabase = createClient(
    'https://zgdfjcodbzpkjlgnjxrk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZGZqY29kYnpwa2psZ25qeHJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjkxOTczOSwiZXhwIjoyMDUyNDk1NzM5fQ.Zk5h7XnzOKUjdm8hQTp8vLOBx7pxj-b3rEbmS30dWxM'
  );
  
  console.log('🚀 Executing SQL...\n');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: sql });
    
    if (error) {
      console.log('Error:', error);
      console.log('\n⚠️  Trying direct execution...\n');
      
      // Split and execute each statement
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const stmt of statements) {
        if (!stmt.trim()) continue;
        try {
          await supabase.rpc('exec_sql', { sql: stmt + ';' });
          console.log('✅ Statement executed');
        } catch (e) {
          console.log('⚠️ ', e.message);
        }
      }
    } else {
      console.log('✅ SQL executed successfully!\n');
    }
  } catch (err) {
    console.log('Error executing:', err.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✨ DONE');
  console.log('='.repeat(70) + '\n');
}

pushToSupabase().catch(console.error);
