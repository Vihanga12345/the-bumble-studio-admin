-- Fix sales_order_items schema to support variants
-- This script updates the sales_order_items table structure

DO $$
BEGIN
    -- Rename product_id to inventory_item_id if product_id exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sales_order_items' AND column_name = 'product_id') THEN
        ALTER TABLE public.sales_order_items RENAME COLUMN product_id TO inventory_item_id;
        RAISE NOTICE 'Renamed product_id to inventory_item_id';
    END IF;

    -- Add variant_item_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_order_items' AND column_name = 'variant_item_id') THEN
        ALTER TABLE public.sales_order_items ADD COLUMN variant_item_id UUID REFERENCES public.inventory_items(id);
        RAISE NOTICE 'Added variant_item_id column';
    END IF;

    -- Make inventory_item_id nullable since we might only have variant_item_id
    ALTER TABLE public.sales_order_items ALTER COLUMN inventory_item_id DROP NOT NULL;
    
    RAISE NOTICE 'Sales order items schema updated successfully';
END $$;

-- Add check constraint to ensure at least one ID is provided
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_item_check') THEN
        ALTER TABLE public.sales_order_items 
        ADD CONSTRAINT sales_order_items_item_check 
        CHECK (inventory_item_id IS NOT NULL OR variant_item_id IS NOT NULL);
        RAISE NOTICE 'Added constraint to ensure item or variant is specified';
    END IF;
END $$;

-- Update total_price column to be auto-calculated if needed
ALTER TABLE public.sales_order_items ALTER COLUMN total_price DROP NOT NULL;

-- Success message
SELECT 'Sales order items schema fixed successfully!' as status;
