const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://kaczhcjgicswvgfxvmgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY3poY2pnaWNzd3ZnZnh2bWd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTg5NzU2OSwiZXhwIjoyMDUxNDczNTY5fQ.rB7Jm92tJRUiBCR8L9kDmTkP5KCOzb10RbqcRNaH7FE';

const supabase = createClient(supabaseUrl, supabaseKey);

// Read SQL file
const sqlFile = process.argv[2] || 'src/SQL Queries/Enhanced_Sales_Orders.sql';
const sqlPath = path.join(__dirname, sqlFile);

console.log(`Reading SQL file: ${sqlPath}`);

fs.readFile(sqlPath, 'utf8', async (err, sql) => {
  if (err) {
    console.error('Error reading SQL file:', err);
    process.exit(1);
  }

  console.log('Executing SQL...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error executing SQL:', error);
      process.exit(1);
    }
    
    console.log('✅ SQL executed successfully!');
    console.log('Response:', data);
  } catch (error) {
    console.error('Exception:', error);
    process.exit(1);
  }
});
