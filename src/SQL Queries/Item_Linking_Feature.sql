-- ============================================================
-- ITEM LINKING FEATURE - Database Setup
-- This script adds the ability to:
-- 1. Categorize items as "Materials" or "Finished Products"
-- 2. Link items together (e.g., materials used in finished products)
-- 3. View linked items and their relationships
-- ============================================================

-- Step 1: Create ENUM type for item_type (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE item_type_enum AS ENUM ('Materials', 'Finished Products');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add item_type column to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'Materials' CHECK (item_type IN ('Materials', 'Finished Products'));

-- Step 3: Create the item_links table for linking items together
CREATE TABLE IF NOT EXISTS item_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    child_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10, 3) DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Prevent duplicate links
    UNIQUE(parent_item_id, child_item_id),
    
    -- Prevent self-linking
    CHECK (parent_item_id != child_item_id)
);

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_item_links_parent ON item_links(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_item_links_child ON item_links(child_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_type ON inventory_items(item_type);

-- Step 5: Enable RLS on item_links table
ALTER TABLE item_links ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for item_links
DROP POLICY IF EXISTS "Allow all operations on item_links" ON item_links;
CREATE POLICY "Allow all operations on item_links" ON item_links
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 7: Grant permissions
GRANT ALL ON item_links TO authenticated;
GRANT ALL ON item_links TO anon;

-- Step 8: Create a function to get all linked items for a given item
CREATE OR REPLACE FUNCTION get_linked_items(p_item_id UUID)
RETURNS TABLE (
    link_id UUID,
    linked_item_id UUID,
    linked_item_name TEXT,
    linked_item_type TEXT,
    linked_item_sku TEXT,
    quantity_required DECIMAL,
    link_type TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Get items where current item is the parent (child items/sub-items)
    SELECT 
        il.id as link_id,
        ii.id as linked_item_id,
        ii.name as linked_item_name,
        ii.item_type as linked_item_type,
        ii.sku as linked_item_sku,
        il.quantity_required,
        'child'::TEXT as link_type,
        il.notes
    FROM item_links il
    JOIN inventory_items ii ON il.child_item_id = ii.id
    WHERE il.parent_item_id = p_item_id
    
    UNION ALL
    
    -- Get items where current item is the child (parent items)
    SELECT 
        il.id as link_id,
        ii.id as linked_item_id,
        ii.name as linked_item_name,
        ii.item_type as linked_item_type,
        ii.sku as linked_item_sku,
        il.quantity_required,
        'parent'::TEXT as link_type,
        il.notes
    FROM item_links il
    JOIN inventory_items ii ON il.parent_item_id = ii.id
    WHERE il.child_item_id = p_item_id;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create a function to get materials linked to finished products
CREATE OR REPLACE FUNCTION get_materials_for_finished_product(p_finished_product_id UUID)
RETURNS TABLE (
    link_id UUID,
    material_id UUID,
    material_name TEXT,
    material_sku TEXT,
    quantity_required DECIMAL,
    current_stock INTEGER,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        il.id as link_id,
        ii.id as material_id,
        ii.name as material_name,
        ii.sku as material_sku,
        il.quantity_required,
        ii.current_stock,
        il.notes
    FROM item_links il
    JOIN inventory_items ii ON il.child_item_id = ii.id
    WHERE il.parent_item_id = p_finished_product_id
    AND ii.item_type = 'Materials';
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create a function to get finished products that use a material
CREATE OR REPLACE FUNCTION get_finished_products_using_material(p_material_id UUID)
RETURNS TABLE (
    link_id UUID,
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    quantity_required DECIMAL,
    current_stock INTEGER,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        il.id as link_id,
        ii.id as product_id,
        ii.name as product_name,
        ii.sku as product_sku,
        il.quantity_required,
        ii.current_stock,
        il.notes
    FROM item_links il
    JOIN inventory_items ii ON il.parent_item_id = ii.id
    WHERE il.child_item_id = p_material_id
    AND ii.item_type = 'Finished Products';
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create a view for easier querying of item relationships
CREATE OR REPLACE VIEW item_relationships AS
SELECT 
    il.id as link_id,
    parent.id as parent_id,
    parent.name as parent_name,
    parent.item_type as parent_type,
    parent.sku as parent_sku,
    child.id as child_id,
    child.name as child_name,
    child.item_type as child_type,
    child.sku as child_sku,
    il.quantity_required,
    il.notes,
    il.created_at
FROM item_links il
JOIN inventory_items parent ON il.parent_item_id = parent.id
JOIN inventory_items child ON il.child_item_id = child.id;

-- Step 12: Grant access to the view
GRANT SELECT ON item_relationships TO authenticated;
GRANT SELECT ON item_relationships TO anon;

-- Step 13: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_item_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS item_links_updated_at ON item_links;
CREATE TRIGGER item_links_updated_at
    BEFORE UPDATE ON item_links
    FOR EACH ROW
    EXECUTE FUNCTION update_item_links_updated_at();

-- ============================================================
-- VERIFICATION QUERIES (Run these to verify the setup)
-- ============================================================

-- Check if item_type column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'inventory_items' AND column_name = 'item_type';

-- Check if item_links table was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'item_links';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('item_links', 'inventory_items') 
AND indexname LIKE '%item%';

-- ============================================================
-- EXAMPLE USAGE (Optional - for testing)
-- ============================================================

/*
-- Example: Set an item as a Material
UPDATE inventory_items SET item_type = 'Materials' WHERE name = 'Leather Sheet';

-- Example: Set an item as a Finished Product
UPDATE inventory_items SET item_type = 'Finished Products' WHERE name = 'Leather Wallet';

-- Example: Link a material to a finished product
INSERT INTO item_links (parent_item_id, child_item_id, quantity_required, notes)
VALUES (
    (SELECT id FROM inventory_items WHERE name = 'Leather Wallet'),
    (SELECT id FROM inventory_items WHERE name = 'Leather Sheet'),
    0.5,
    '0.5 sq ft of leather per wallet'
);

-- Example: Get all linked items for a product
SELECT * FROM get_linked_items(
    (SELECT id FROM inventory_items WHERE name = 'Leather Wallet')
);

-- Example: Get all materials for a finished product
SELECT * FROM get_materials_for_finished_product(
    (SELECT id FROM inventory_items WHERE name = 'Leather Wallet')
);

-- Example: Get all finished products that use a material
SELECT * FROM get_finished_products_using_material(
    (SELECT id FROM inventory_items WHERE name = 'Leather Sheet')
);
*/

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Item Linking Feature setup completed successfully!';
    RAISE NOTICE '   - Added item_type column to inventory_items';
    RAISE NOTICE '   - Created item_links table for linking items';
    RAISE NOTICE '   - Created helper functions for querying relationships';
    RAISE NOTICE '   - Created item_relationships view';
END $$;

