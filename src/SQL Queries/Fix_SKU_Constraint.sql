-- Fix SKU Unique Constraint Issue
-- This script removes the problematic unique constraint and creates a proper one
-- that allows multiple NULL values but enforces uniqueness for actual SKU values

-- Drop the existing unique constraint on SKU if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_items_sku_unique' 
        AND table_name = 'inventory_items'
    ) THEN
        ALTER TABLE public.inventory_items DROP CONSTRAINT inventory_items_sku_unique;
    END IF;
END $$;

-- Also drop the constraint if it was created with a different name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_items_sku_key' 
        AND table_name = 'inventory_items'
    ) THEN
        ALTER TABLE public.inventory_items DROP CONSTRAINT inventory_items_sku_key;
    END IF;
END $$;

-- Update all empty string SKUs to NULL
UPDATE public.inventory_items 
SET sku = NULL 
WHERE sku = '' OR sku IS NULL OR TRIM(sku) = '';

-- Create a partial unique index that allows multiple NULL values
-- but enforces uniqueness for non-NULL SKUs within the same business
DROP INDEX IF EXISTS idx_inventory_items_sku_unique;
CREATE UNIQUE INDEX idx_inventory_items_sku_unique 
ON public.inventory_items (sku, business_id) 
WHERE sku IS NOT NULL AND TRIM(sku) != '';

-- Make sure SKU column allows NULL values
ALTER TABLE public.inventory_items ALTER COLUMN sku DROP NOT NULL;

SELECT 'SKU constraint fixed successfully!' as message;
SELECT 'Empty SKUs converted to NULL and unique constraint updated' as status; 