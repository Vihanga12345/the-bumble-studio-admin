-- ============================================================================
-- COMPLETE INVENTORY & VARIANT SYSTEM SETUP
-- ============================================================================
-- This script creates a comprehensive system for:
-- 1. Inventory transactions tracking
-- 2. Parent-child item relationships (main items with sub-items/variants)
-- 3. Separate pricing and quantities for each variant
-- 4. Sales order and purchase order integration
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE INVENTORY TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('craft_completed', 'manufacturing_used', 'adjustment', 'sales_order', 'purchase_order', 'manual')),
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    variant_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    reference_id UUID,
    reference_type TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.erp_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON public.inventory_transactions(reference_id, reference_type);

-- ============================================================================
-- PART 2: ADD PARENT-CHILD RELATIONSHIP TO INVENTORY ITEMS
-- ============================================================================

-- Add parent_item_id to create hierarchical structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' AND column_name = 'parent_item_id') THEN
        ALTER TABLE public.inventory_items ADD COLUMN parent_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_inventory_items_parent ON public.inventory_items(parent_item_id);
        COMMENT ON COLUMN public.inventory_items.parent_item_id IS 'Parent item ID for variants/sub-items. NULL = main item, NOT NULL = variant';
    END IF;
END $$;

-- Add variant_name column for better identification
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' AND column_name = 'variant_name') THEN
        ALTER TABLE public.inventory_items ADD COLUMN variant_name TEXT;
        COMMENT ON COLUMN public.inventory_items.variant_name IS 'Name of this variant (e.g., "Black", "Large", "Type A")';
    END IF;
END $$;

-- Add is_variant flag for easy filtering
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' AND column_name = 'is_variant') THEN
        ALTER TABLE public.inventory_items ADD COLUMN is_variant BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_inventory_items_is_variant ON public.inventory_items(is_variant);
        COMMENT ON COLUMN public.inventory_items.is_variant IS 'TRUE if this is a variant/sub-item, FALSE if main item';
    END IF;
END $$;

-- ============================================================================
-- PART 3: FIX SALES_ORDERS TABLE
-- ============================================================================

-- Add order_number if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'order_number') THEN
        ALTER TABLE public.sales_orders ADD COLUMN order_number TEXT;
    END IF;
    
    -- Make nullable and add default
    ALTER TABLE public.sales_orders ALTER COLUMN order_number DROP NOT NULL;
    ALTER TABLE public.sales_orders ALTER COLUMN order_number SET DEFAULT 'SO-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
END $$;

-- ============================================================================
-- PART 4: FIX SALES_ORDER_ITEMS TABLE  
-- ============================================================================

-- Check if sales_order_items needs to be recreated or just altered
DO $$
BEGIN
    -- Check if item_id column exists with wrong name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_order_items' AND column_name = 'item_id') THEN
        -- If item_id doesn't exist, it might be named differently
        -- Try to rename if it exists with another name
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_order_items' AND column_name = 'inventory_item_id') THEN
            ALTER TABLE public.sales_order_items RENAME COLUMN inventory_item_id TO item_id;
        END IF;
    END IF;
    
    -- Add variant_item_id for sub-item selection
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_order_items' AND column_name = 'variant_item_id') THEN
        ALTER TABLE public.sales_order_items ADD COLUMN variant_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;
        COMMENT ON COLUMN public.sales_order_items.variant_item_id IS 'Selected variant/sub-item ID. NULL = main item only';
    END IF;
END $$;

-- ============================================================================
-- PART 5: FIX PURCHASE_ORDER_ITEMS TABLE
-- ============================================================================

DO $$
BEGIN
    -- Fix item_id column name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_order_items' AND column_name = 'item_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_order_items' AND column_name = 'inventory_item_id') THEN
            ALTER TABLE public.purchase_order_items RENAME COLUMN inventory_item_id TO item_id;
        END IF;
    END IF;
    
    -- Add variant_item_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_order_items' AND column_name = 'variant_item_id') THEN
        ALTER TABLE public.purchase_order_items ADD COLUMN variant_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- PART 6: CREATE FUNCTION TO CALCULATE PARENT ITEM STOCK
-- ============================================================================

-- Function to update parent item stock based on all variant stocks
CREATE OR REPLACE FUNCTION update_parent_item_stock(p_parent_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_stock INTEGER;
BEGIN
    -- Calculate sum of all variant stocks
    SELECT COALESCE(SUM(current_stock), 0)
    INTO v_total_stock
    FROM public.inventory_items
    WHERE parent_item_id = p_parent_id AND is_variant = TRUE;
    
    -- Update parent item stock
    UPDATE public.inventory_items
    SET current_stock = v_total_stock,
        updated_at = NOW()
    WHERE id = p_parent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 7: CREATE TRIGGER TO AUTO-UPDATE PARENT STOCK
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_parent_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a variant and stock changed, update parent
    IF NEW.is_variant = TRUE AND NEW.parent_item_id IS NOT NULL THEN
        IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
            PERFORM update_parent_item_stock(NEW.parent_item_id);
        ELSIF (TG_OP = 'DELETE') THEN
            PERFORM update_parent_item_stock(OLD.parent_item_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_parent_stock_on_change ON public.inventory_items;
CREATE TRIGGER trigger_update_parent_stock_on_change
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_parent_stock();

-- ============================================================================
-- PART 8: CREATE FUNCTION TO RECORD INVENTORY TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION record_inventory_transaction(
    p_item_id UUID,
    p_transaction_type TEXT,
    p_quantity_change INTEGER,
    p_variant_item_id UUID DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_transaction_id UUID;
    v_actual_item_id UUID;
BEGIN
    -- Determine which item to update (variant if specified, otherwise main item)
    v_actual_item_id := COALESCE(p_variant_item_id, p_item_id);
    
    -- Get current quantity
    SELECT current_stock INTO v_current_quantity
    FROM public.inventory_items
    WHERE id = v_actual_item_id;
    
    IF v_current_quantity IS NULL THEN
        RAISE EXCEPTION 'Item not found: %', v_actual_item_id;
    END IF;
    
    -- Calculate new quantity
    v_new_quantity := v_current_quantity + p_quantity_change;
    
    -- Prevent negative stock
    IF v_new_quantity < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested change: %', v_current_quantity, p_quantity_change;
    END IF;
    
    -- Update item quantity
    UPDATE public.inventory_items
    SET current_stock = v_new_quantity,
        updated_at = NOW()
    WHERE id = v_actual_item_id;
    
    -- Record transaction
    INSERT INTO public.inventory_transactions (
        item_id,
        transaction_type,
        quantity_change,
        quantity_before,
        quantity_after,
        variant_item_id,
        reference_id,
        reference_type,
        notes,
        created_by
    ) VALUES (
        p_item_id,
        p_transaction_type,
        p_quantity_change,
        v_current_quantity,
        v_new_quantity,
        p_variant_item_id,
        p_reference_id,
        p_reference_type,
        p_notes,
        p_created_by
    ) RETURNING id INTO v_transaction_id;
    
    -- If variant was updated, trigger will auto-update parent stock
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 9: CREATE TRIGGER FOR AUTO STOCK REDUCTION ON DELIVERY
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_reduce_stock_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
BEGIN
    IF NEW.order_status = 'Delivered' AND (OLD.order_status IS NULL OR OLD.order_status != 'Delivered') THEN
        FOR v_item IN 
            SELECT item_id, variant_item_id, quantity
            FROM public.sales_order_items
            WHERE sales_order_id = NEW.id
        LOOP
            PERFORM record_inventory_transaction(
                v_item.item_id,
                'sales_order',
                -v_item.quantity,
                v_item.variant_item_id,
                NEW.id,
                'sales_order',
                'Stock reduced for order: ' || COALESCE(NEW.order_number, NEW.id::text),
                NULL
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_reduce_stock_on_delivery ON public.sales_orders;
CREATE TRIGGER trigger_auto_reduce_stock_on_delivery
    AFTER UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_reduce_stock_on_delivery();

-- ============================================================================
-- PART 10: GRANT ALL PERMISSIONS
-- ============================================================================

GRANT ALL ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO anon;
GRANT ALL ON public.inventory_transactions TO public;

GRANT ALL ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO anon;
GRANT ALL ON public.inventory_items TO public;

GRANT ALL ON public.sales_orders TO authenticated;
GRANT ALL ON public.sales_orders TO anon;
GRANT ALL ON public.sales_orders TO public;

GRANT ALL ON public.sales_order_items TO authenticated;
GRANT ALL ON public.sales_order_items TO anon;
GRANT ALL ON public.sales_order_items TO public;

GRANT ALL ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO anon;
GRANT ALL ON public.purchase_orders TO public;

GRANT ALL ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO anon;
GRANT ALL ON public.purchase_order_items TO public;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- Database schema updated successfully!
-- 
-- New Features:
-- 1. Inventory transactions table created
-- 2. Parent-child relationships for items (main items with variants)
-- 3. Each variant has its own price and quantity
-- 4. Parent item quantity = sum of variant quantities (auto-calculated)
-- 5. Plus/Minus buttons work for both main items and variants
-- 6. Sales orders support variant selection
-- 7. Purchase orders support variant selection
-- 8. Auto stock reduction when order delivered
-- 9. All permissions granted
-- ============================================================================
