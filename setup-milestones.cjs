const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Read the SQL file
const sqlPath = path.join(__dirname, 'src', 'SQL Queries', 'Order_Milestones_System.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('\n' + '='.repeat(80));
console.log('🎯 ORDER MILESTONES SYSTEM SETUP');
console.log('='.repeat(80));
console.log('\nThis script will create a complete milestone tracking system:');
console.log('✅ 6 Milestone stages per order');
console.log('✅ Up to 4 images per milestone');
console.log('✅ Checkbox to mark milestones complete');
console.log('✅ Auto-sync between admin and website');
console.log('✅ Beautiful display on "How It\'s Made" page\n');

console.log('📋 MILESTONES:');
console.log('  1️⃣  Order Confirmed');
console.log('  2️⃣  Leathers Selected');
console.log('  3️⃣  Cut Pieces');
console.log('  4️⃣  Stitching');
console.log('  5️⃣  Finishing');
console.log('  6️⃣  Packed\n');

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

console.log('✅ After running this SQL:');
console.log('   - Milestone tables and functions will be created');
console.log('   - All existing orders will have milestones initialized');
console.log('   - Storage bucket for milestone images will be ready');
console.log('   - Admin can upload images and mark milestones complete');
console.log('   - Website visitors can see the crafting journey\n');

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
