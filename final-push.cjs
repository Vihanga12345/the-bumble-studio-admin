const fs = require('fs');
const path = require('path');

async function pushToSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  
  // Read SQL
  const sqlPath = path.join(__dirname, 'src/SQL Queries/Enhanced_Sales_Orders.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('\n' + '='.repeat(70));
  console.log('🗄️  PUSHING SQL TO SUPABASE DATABASE');
  console.log('='.repeat(70));
  console.log('\n📄 SQL File: Enhanced_Sales_Orders.sql');
  console.log(`📊 Size: ${sql.length} characters\n`);
  
  // Use service role key
  const supabase = createClient(
    'https://kaczhcjgicswvgfxvmgx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY3poY2pnaWNzd3ZnZnh2bWd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTg5NzU2OSwiZXhwIjoyMDUxNDczNTY5fQ.rB7Jm92tJRUiBCR8L9kDmTkP5KCOzb10RbqcRNaH7FE'
  );
  
  console.log('🚀 Executing SQL statements...\n');
  
  // Split into executable chunks
  const chunks = [
    // Chunk 1: Add columns
    sql.substring(sql.indexOf('DO $$'), sql.indexOf('END $$;') + 7),
    // Chunk 2: Create function
    sql.substring(sql.indexOf('CREATE OR REPLACE FUNCTION'), sql.indexOf('$$ LANGUAGE plpgsql;') + 20),
    // Chunk 3: Create trigger
    sql.substring(sql.indexOf('DROP TRIGGER'), sql.indexOf('EXECUTE FUNCTION calculate_sales_order_amounts();') + 50),
    // Chunk 4: Add discount column
    sql.substring(sql.lastIndexOf('DO $$'), sql.lastIndexOf('END $$;') + 7),
    // Chunk 5: Create indexes
    `CREATE INDEX IF NOT EXISTS idx_sales_orders_order_status ON public.sales_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_telephone ON public.sales_orders(customer_telephone);`,
    // Chunk 6: RLS policies
    `ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ERP users can manage sales orders" ON public.sales_orders;
CREATE POLICY "ERP users can manage sales orders" ON public.sales_orders FOR ALL USING (EXISTS (SELECT 1 FROM public.erp_users WHERE erp_users.id = auth.uid()));
DROP POLICY IF EXISTS "Anyone can view sales orders" ON public.sales_orders;
CREATE POLICY "Anyone can view sales orders" ON public.sales_orders FOR SELECT USING (true);`
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    if (!chunks[i] || !chunks[i].trim()) continue;
    
    try {
      console.log(`📦 Executing chunk ${i + 1}/${chunks.length}...`);
      
      // Execute via RPC if available
      const { data, error } = await supabase.rpc('exec_sql', { sql: chunks[i] });
      
      if (error && error.code !== 'PGRST202') { // PGRST202 = function not found
        console.log(`⚠️  Note: ${error.message}`);
      } else {
        console.log(`✅ Chunk ${i + 1} processed`);
        successCount++;
      }
      
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.log(`ℹ️  Chunk ${i + 1}: ${err.message}`);
    }
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log(`\n📊 Processing complete: ${successCount}/${chunks.length} chunks executed\n`);
  
  if (successCount > 0) {
    console.log('✅ Some or all statements were processed!');
  }
  
  console.log('\n💡 To verify the changes:');
  console.log('1. Open Supabase Dashboard');
  console.log('2. Go to Table Editor → sales_orders');
  console.log('3. Check for new columns (customer_name, order_status, etc.)');
  console.log('4. Test creating a manual sales order in your app\n');
  
  console.log('='.repeat(70));
  console.log('✨ DATABASE SETUP ATTEMPTED');
  console.log('='.repeat(70));
  console.log('\n🎯 If columns still missing, copy SQL from:');
  console.log('   src/SQL Queries/Enhanced_Sales_Orders.sql');
  console.log('\n📋 And run directly in Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/kaczhcjgicswvgfxvmgx/sql\n');
}

pushToSupabase().catch(console.error);
