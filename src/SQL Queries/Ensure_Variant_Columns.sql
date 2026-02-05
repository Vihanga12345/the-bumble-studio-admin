-- Ensure variant columns exist in inventory_items table

DO $$
BEGIN
    -- Add parent_item_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' AND column_name = 'parent_item_id') THEN
        ALTER TABLE public.inventory_items ADD COLUMN parent_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_inventory_items_parent ON public.inventory_items(parent_item_id);
        RAISE NOTICE 'Added parent_item_id column';
    END IF;

    -- Add variant_name if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' AND column_name = 'variant_name') THEN
        ALTER TABLE public.inventory_items ADD COLUMN variant_name TEXT;
        RAISE NOTICE 'Added variant_name column';
    END IF;

    -- Add is_variant if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' AND column_name = 'is_variant') THEN
        ALTER TABLE public.inventory_items ADD COLUMN is_variant BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_inventory_items_is_variant ON public.inventory_items(is_variant);
        RAISE NOTICE 'Added is_variant column';
    END IF;

    RAISE NOTICE 'Variant columns ensured successfully';
END $$;

SELECT 'Variant columns ready!' as status;
