-- URGENT FIX FOR PURCHASE ORDER ITEMS business_id COLUMN
-- Run this immediately in Supabase SQL Editor

-- 1. Add business_id column to purchase_order_items if it doesn't exist
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000';

-- 2. Update existing purchase_order_items to have the default business_id
UPDATE purchase_order_items 
SET business_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE business_id IS NULL;

-- 3. Make business_id NOT NULL (optional, but recommended)
ALTER TABLE purchase_order_items ALTER COLUMN business_id SET NOT NULL;

-- 4. Update the schema cache (this forces Supabase to refresh its cache)
-- Drop and recreate any problematic indexes
DROP INDEX IF EXISTS idx_purchase_order_items_business_id;
CREATE INDEX idx_purchase_order_items_business_id ON purchase_order_items(business_id);

-- 5. Verify the column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'purchase_order_items' AND column_name = 'business_id'; 