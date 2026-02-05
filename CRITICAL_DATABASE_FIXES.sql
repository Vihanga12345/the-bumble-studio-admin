-- CRITICAL DATABASE FIXES FOR PURCHASE ORDER CREATION
-- Run these commands in Supabase SQL Editor in this exact order

-- 1. Create a default business if it doesn't exist
INSERT INTO businesses (id, name, address, phone, email, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Default Business',
  '123 Default Street',
  '+1-555-0123',
  'admin@defaultbusiness.com',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Add business_id to erp_users table if missing
ALTER TABLE erp_users ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';

-- 3. Update existing users to have the default business_id
UPDATE erp_users 
SET business_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE business_id IS NULL;

-- 4. Add business_id to purchase_orders table if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';

-- 5. Update existing purchase orders to have the default business_id
UPDATE purchase_orders 
SET business_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE business_id IS NULL;

-- 6. Make business_id required for purchase_orders
ALTER TABLE purchase_orders ALTER COLUMN business_id SET NOT NULL;

-- 7. Add business_id to related tables
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';

-- 8. Fix the foreign key relationship for purchase_order_items
ALTER TABLE purchase_order_items 
DROP CONSTRAINT IF EXISTS fk_purchase_order_items_inventory_items;

ALTER TABLE purchase_order_items 
ADD CONSTRAINT fk_purchase_order_items_inventory_items 
FOREIGN KEY (item_id) REFERENCES inventory_items(id);

-- 9. Create inventory_adjustments table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  adjustment_type varchar(50) NOT NULL,
  quantity_change integer NOT NULL,
  reason varchar(255),
  adjustment_date timestamp with time zone DEFAULT NOW(),
  created_by uuid REFERENCES erp_users(id),
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- 10. Create goods_received_note_items table if missing (fixes the relationship hint error)
CREATE TABLE IF NOT EXISTS goods_received_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
  purchase_order_item_id uuid REFERENCES purchase_order_items(id),
  quantity_received integer NOT NULL,
  received_date timestamp with time zone DEFAULT NOW(),
  created_at timestamp with time zone DEFAULT NOW()
);

-- 11. Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_business_id ON purchase_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id ON purchase_order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_item_id ON inventory_adjustments(inventory_item_id);

-- VERIFICATION QUERIES (Optional - run these to check if everything worked)
-- SELECT COUNT(*) FROM businesses WHERE id = '550e8400-e29b-41d4-a716-446655440000';
-- SELECT COUNT(*) FROM erp_users WHERE business_id IS NULL;
-- SELECT COUNT(*) FROM purchase_orders WHERE business_id IS NULL; 