import { supabase } from '@/integrations/supabase/client';

export async function fixSKUConstraints() {
  try {
    console.log('🔧 Starting database constraint fixes...');

    // First, let's check what constraints exist
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, table_name')
      .eq('table_name', 'inventory_items')
      .like('constraint_name', '%sku%');

    if (constraintError) {
      console.log('Could not check constraints, continuing with fixes...');
    } else {
      console.log('Found SKU constraints:', constraints);
    }

    // Update all empty string SKUs to NULL
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ sku: null })
      .or('sku.eq.,sku.is.null');

    if (updateError) {
      console.error('Error updating empty SKUs:', updateError);
    } else {
      console.log('✅ Updated empty SKUs to NULL');
    }

    // Try to run the constraint fixes via RPC if available
    try {
      const { error: rpcError } = await supabase.rpc('fix_sku_constraints');
      if (rpcError) {
        console.log('RPC function not available, constraints may need manual fixing');
      } else {
        console.log('✅ RPC constraint fix completed');
      }
    } catch (rpcErr) {
      console.log('RPC function not available, continuing...');
    }

    console.log('🎉 Database fix attempt completed!');
    return true;
  } catch (error) {
    console.error('Error fixing database:', error);
    return false;
  }
}

// Call this function in development
if (import.meta.env.DEV) {
  fixSKUConstraints();
} 