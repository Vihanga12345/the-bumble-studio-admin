-- Fix Purchase Order Schema Issues
-- This script fixes the business_id constraint issues and relationship problems

-- 1. Add business_id to erp_users table if it doesn't exist
ALTER TABLE erp_users ADD COLUMN IF NOT EXISTS business_id uuid;

-- 2. Create a default business for existing users
INSERT INTO businesses (id, name, address, phone, email, created_at, updated_at)
VALUES (
  'default-business-uuid-12345678',
  'Default Business',
  '123 Default Street',
  '+1-555-0123',
  'admin@defaultbusiness.com',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Update existing users to have the default business_id
UPDATE erp_users 
SET business_id = 'default-business-uuid-12345678'
WHERE business_id IS NULL;

-- 4. Make business_id required for erp_users
ALTER TABLE erp_users ALTER COLUMN business_id SET NOT NULL;

-- 5. Add business_id to purchase_orders if not exists and make it nullable temporarily
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS business_id uuid;

-- 6. Update existing purchase orders to have the default business_id
UPDATE purchase_orders 
SET business_id = 'default-business-uuid-12345678'
WHERE business_id IS NULL;

-- 7. Make business_id required for purchase_orders
ALTER TABLE purchase_orders ALTER COLUMN business_id SET NOT NULL;

-- 8. Add business_id to other related tables
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT 'default-business-uuid-12345678';
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT 'default-business-uuid-12345678';
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT 'default-business-uuid-12345678';

-- 9. Create proper foreign key relationships
ALTER TABLE purchase_order_items 
DROP CONSTRAINT IF EXISTS fk_purchase_order_items_inventory_items;

ALTER TABLE purchase_order_items 
ADD CONSTRAINT fk_purchase_order_items_inventory_items 
FOREIGN KEY (item_id) REFERENCES inventory_items(id);

-- 10. Create inventory_adjustments table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL DEFAULT 'default-business-uuid-12345678',
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  adjustment_type varchar(50) NOT NULL, -- 'increase', 'decrease', 'correction'
  quantity_change integer NOT NULL,
  reason varchar(255),
  adjustment_date timestamp with time zone DEFAULT NOW(),
  created_by uuid REFERENCES erp_users(id),
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- 11. Add RLS policies for multi-business architecture
ALTER TABLE erp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- 12. Create business isolation policies (basic ones)
DROP POLICY IF EXISTS "Users can only see users from their business" ON erp_users;
CREATE POLICY "Users can only see users from their business" ON erp_users
  FOR ALL USING (business_id = (SELECT business_id FROM erp_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can only see purchase orders from their business" ON purchase_orders;
CREATE POLICY "Users can only see purchase orders from their business" ON purchase_orders
  FOR ALL USING (business_id = (SELECT business_id FROM erp_users WHERE id = auth.uid()));

-- 13. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_erp_users_business_id ON erp_users(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_business_id ON purchase_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_business_id ON inventory_items(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id ON purchase_order_items(item_id);

-- 14. Fix goods_received_note_items relationship hint
CREATE TABLE IF NOT EXISTS goods_received_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL DEFAULT 'default-business-uuid-12345678',
  purchase_order_item_id uuid REFERENCES purchase_order_items(id),
  quantity_received integer NOT NULL,
  received_date timestamp with time zone DEFAULT NOW(),
  created_at timestamp with time zone DEFAULT NOW()
);

COMMENT ON SCRIPT IS 'Fixed purchase order schema issues and business_id constraints'; 