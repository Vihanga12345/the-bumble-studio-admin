const fs = require('fs');
const path = require('path');

// Read the SQL file
const sqlFile = 'src/SQL Queries/Add_Delivery_Cost_Column.sql';
const sqlPath = path.join(__dirname, sqlFile);

console.log('\n' + '='.repeat(70));
console.log('🗄️  ADD DELIVERY COST COLUMN - SQL EXECUTOR');
console.log('='.repeat(70));

if (!fs.existsSync(sqlPath)) {
  console.error(`\n❌ File not found: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('\n📋 File Details:');
console.log(`   Path: ${sqlPath}`);
console.log(`   Size: ${sql.length} characters`);
console.log(`   Lines: ${sql.split('\n').length}\n`);

console.log('─'.repeat(70));
console.log('\n📋 TO EXECUTE THIS SQL:\n');
console.log('1. Open: https://supabase.com/dashboard/project/zgdfjcodbzpkjlgnjxrk/sql/new');
console.log('2. Copy the SQL content shown below');
console.log('3. Paste into SQL Editor');
console.log('4. Click RUN (or press Ctrl+Enter)\n');
console.log('─'.repeat(70));

console.log('\n📝 SQL CONTENT TO COPY:\n');
console.log('='.repeat(70));
console.log(sql);
console.log('='.repeat(70));

console.log('\n✅ File content displayed above');
console.log('📋 Copy this content and paste it into Supabase SQL Editor\n');

// Try to open browser
try {
  const { exec } = require('child_process');
  const url = 'https://supabase.com/dashboard/project/zgdfjcodbzpkjlgnjxrk/sql/new';
  
  console.log('🌐 Attempting to open Supabase SQL Editor in browser...\n');
  
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
