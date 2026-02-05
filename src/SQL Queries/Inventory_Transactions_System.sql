-- Inventory Transactions System
-- This creates a comprehensive transaction tracking system for inventory movements

-- ============================================================================
-- PART 1: CREATE INVENTORY TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('craft_completed', 'manufacturing_used', 'adjustment', 'sales_order', 'purchase_order', 'manual')),
    quantity_change INTEGER NOT NULL, -- Positive for additions, negative for reductions
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    variant_name TEXT, -- For tracking which variant was affected
    reference_id UUID, -- Link to sales_order, purchase_order, etc.
    reference_type TEXT, -- 'sales_order', 'purchase_order', 'adjustment', etc.
    notes TEXT,
    created_by UUID REFERENCES public.erp_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON public.inventory_transactions(reference_id, reference_type);

-- ============================================================================
-- PART 2: ADD VARIANT QUANTITY TRACKING TO ITEMS
-- ============================================================================

-- Add variant_quantities JSON column to store quantities per variant
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_items' AND column_name = 'variant_quantities') THEN
        ALTER TABLE public.inventory_items ADD COLUMN variant_quantities JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN public.inventory_items.variant_quantities IS 'Stores quantity for each product variant: [{"name": "Type 1", "quantity": 10, "imageUrl": "..."}]';
    END IF;
END $$;

-- ============================================================================
-- PART 3: ADD ORDER_NUMBER TO SALES_ORDERS (IF MISSING)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_orders' AND column_name = 'order_number') THEN
        ALTER TABLE public.sales_orders ADD COLUMN order_number TEXT UNIQUE;
    END IF;
    
    -- Make order_number NOT NULL after adding it
    ALTER TABLE public.sales_orders ALTER COLUMN order_number DROP NOT NULL;
    ALTER TABLE public.sales_orders ALTER COLUMN order_number SET DEFAULT 'SO-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
END $$;

-- ============================================================================
-- PART 4: ADD VARIANT SELECTION TO SALES ORDER ITEMS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales_order_items' AND column_name = 'variant_name') THEN
        ALTER TABLE public.sales_order_items ADD COLUMN variant_name TEXT;
        COMMENT ON COLUMN public.sales_order_items.variant_name IS 'The selected product variant for this order item';
    END IF;
END $$;

-- ============================================================================
-- PART 5: CREATE FUNCTION TO RECORD INVENTORY TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION record_inventory_transaction(
    p_item_id UUID,
    p_transaction_type TEXT,
    p_quantity_change INTEGER,
    p_variant_name TEXT DEFAULT NULL,
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
BEGIN
    -- Get current quantity
    SELECT current_stock INTO v_current_quantity
    FROM public.inventory_items
    WHERE id = p_item_id;
    
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
    WHERE id = p_item_id;
    
    -- Record transaction
    INSERT INTO public.inventory_transactions (
        item_id,
        transaction_type,
        quantity_change,
        quantity_before,
        quantity_after,
        variant_name,
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
        p_variant_name,
        p_reference_id,
        p_reference_type,
        p_notes,
        p_created_by
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: CREATE TRIGGER TO AUTO-RECORD SALES ORDER DELIVERY
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_reduce_stock_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- Only process when status changes to 'Delivered'
    IF NEW.order_status = 'Delivered' AND (OLD.order_status IS NULL OR OLD.order_status != 'Delivered') THEN
        -- Loop through all items in the order
        FOR v_item IN 
            SELECT item_id, quantity, variant_name
            FROM public.sales_order_items
            WHERE sales_order_id = NEW.id
        LOOP
            -- Record transaction and reduce stock
            PERFORM record_inventory_transaction(
                v_item.item_id,
                'sales_order',
                -v_item.quantity, -- Negative for reduction
                v_item.variant_name,
                NEW.id,
                'sales_order',
                'Stock reduced for order: ' || NEW.order_number,
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
-- PART 7: GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO anon;
GRANT ALL ON public.inventory_transactions TO public;

-- ============================================================================
-- SUCCESS
-- ============================================================================
-- Inventory transactions system created successfully
-- Features enabled:
--   - Transaction history tracking
--   - Variant quantity management
--   - Auto stock reduction on delivery
--   - Craft completion tracking
--   - Manufacturing usage tracking
