-- =====================================================
-- Item Category Migration: Selling vs Crafting Items
-- =====================================================
-- This migration adds support for differentiating between
-- Selling Items (displayed on website) and Crafting Items (internal use only)
-- 
-- Run this in Supabase SQL Editor

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

-- Step 5: Create a function to automatically hide out-of-stock selling items from website
CREATE OR REPLACE FUNCTION update_website_visibility()
RETURNS TRIGGER AS $$
BEGIN
  -- For Selling items, automatically set is_website_item based on stock
  IF NEW.item_category = 'Selling' THEN
    IF NEW.current_stock > 0 THEN
      NEW.is_website_item := true;
    ELSE
      NEW.is_website_item := false;
    END IF;
  END IF;
  
  -- For Crafting items, always set is_website_item to false
  IF NEW.item_category = 'Crafting' THEN
    NEW.is_website_item := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to automatically update website visibility
DROP TRIGGER IF EXISTS trigger_update_website_visibility ON inventory_items;
CREATE TRIGGER trigger_update_website_visibility
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_website_visibility();

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
