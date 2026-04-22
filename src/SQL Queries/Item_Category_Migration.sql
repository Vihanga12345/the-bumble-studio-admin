-- =====================================================
-- Item Category Migration: Selling vs Crafting Items
-- =====================================================
-- DO NOT RUN - The trigger in Step 5-6 overrides manual is_website_item changes.
-- Use supabase migrations 20260226120000+ instead. Run RUN_THIS_TO_FIX_WEBSITE_VISIBILITY.sql if needed.
--
-- This migration adds support for differentiating between
-- Selling Items (displayed on website) and Crafting Items (internal use only)

-- Step 1: Add new columns to inventory_items table
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS item_category TEXT DEFAULT 'Selling' CHECK (item_category IN ('Selling', 'Crafting')),
ADD COLUMN IF NOT EXISTS purchased_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS product_types JSONB DEFAULT '[]'::jsonb;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN inventory_items.item_category IS 'Category: Selling (displayed on website) or Crafting (internal use only)';
COMMENT ON COLUMN inventory_items.purchased_date IS 'Date when crafting item was purchased';
COMMENT ON COLUMN inventory_items.discount_percentage IS 'Discount percentage for selling items (0-100)';
COMMENT ON COLUMN inventory_items.product_types IS 'Array of product types with images. Format: [{"name": "Green", "imageUrl": "url"}, {"name": "Red", "imageUrl": "url"}]';

-- Step 3: Update existing items
-- Set Crafting items to NOT be displayed on website
UPDATE inventory_items
SET item_category = 'Crafting',
    is_website_item = false
WHERE item_type = 'Materials' OR item_category IS NULL;

-- Set Selling items to be displayed on website if they have stock
UPDATE inventory_items
SET item_category = 'Selling',
    is_website_item = true
WHERE item_type = 'Finished Products' AND current_stock > 0;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(item_category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_stock ON inventory_items(item_category, current_stock) 
WHERE item_category = 'Selling' AND current_stock > 0;

-- Step 5-6: REMOVED - Do NOT create update_website_visibility trigger
-- Manual control of is_website_item via the admin switch. See migrations 20260226120000+

-- Step 7: Verify changes
SELECT 
  item_category,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_website_item = true) as visible_on_website,
  COUNT(*) FILTER (WHERE current_stock > 0) as in_stock
FROM inventory_items
GROUP BY item_category;

-- =====================================================
-- Additional Notes:
-- =====================================================
-- 1. Crafting Items:
--    - item_category = 'Crafting'
--    - is_website_item = false (never displayed on website)
--    - Fields used: name, image_url, description, purchase_cost, purchased_date, is_active
--
-- 2. Selling Items:
--    - item_category = 'Selling'
--    - is_website_item = true (only if current_stock > 0)
--    - Fields used: name, image_url, description, selling_price, discount_percentage, product_types
--    - Automatically hidden from website when out of stock
--
-- 3. Product Types Format:
--    product_types = [
--      {"name": "Green", "imageUrl": "https://..."},
--      {"name": "Red", "imageUrl": "https://..."}
--    ]
-- =====================================================

\echo 'Item Category Migration completed successfully!'
\echo 'Please review the verification query results above.'
