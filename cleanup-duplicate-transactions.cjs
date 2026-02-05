const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Read the SQL file
const sqlPath = path.join(__dirname, 'src', 'SQL Queries', 'Cleanup_Duplicate_Financial_Transactions.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('\n' + '='.repeat(80));
console.log('🧹 CLEANUP DUPLICATE FINANCIAL TRANSACTIONS');
console.log('='.repeat(80));
console.log('\nThis script will remove duplicate financial transaction records.');
console.log('It will keep only the most recent transaction for each order.\n');

console.log('📋 SQL TO EXECUTE:');
console.log('-'.repeat(80));
console.log(sqlContent);
console.log('-'.repeat(80));

console.log('\n📌 INSTRUCTIONS:');
console.log('1. Opening Supabase SQL Editor...');
console.log('2. Copy the SQL above');
console.log('3. Paste it into the SQL Editor');
console.log('4. Click "Run" to execute');
console.log('5. Check the results in the output panel\n');

// Auto-open Supabase SQL editor
const supabaseUrl = 'https://supabase.com/dashboard/project/zgdfjcodbzpkjlgnjxrk/sql/new';
console.log('🌐 Opening Supabase SQL Editor...\n');

// Try to open the browser (works on Windows, macOS, and Linux)
const command = process.platform === 'win32' ? 'start' :
                process.platform === 'darwin' ? 'open' : 'xdg-open';

exec(`${command} "${supabaseUrl}"`, (error) => {
  if (error) {
    console.log('⚠️ Could not auto-open browser. Please manually visit:');
    console.log(`   ${supabaseUrl}\n`);
  } else {
    console.log('✅ Browser opened successfully!\n');
  }
});

console.log('='.repeat(80));
