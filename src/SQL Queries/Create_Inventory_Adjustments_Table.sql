-- =====================================================
-- CREATE INVENTORY ADJUSTMENTS TABLE
-- This table tracks stock adjustments and changes
-- =====================================================

-- Create inventory_adjustments table
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    previous_quantity INTEGER NOT NULL DEFAULT 0,
    new_quantity INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(50) NOT NULL DEFAULT 'manual',
    notes TEXT,
    adjustment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_item_id ON public.inventory_adjustments(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_adjustment_date ON public.inventory_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_reason ON public.inventory_adjustments(reason);

-- Add comment to table
COMMENT ON TABLE public.inventory_adjustments IS 'Tracks all inventory stock adjustments and changes';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_adjustments TO authenticated;
GRANT SELECT ON public.inventory_adjustments TO anon;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_adjustments_updated_at 
    BEFORE UPDATE ON public.inventory_adjustments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample adjustment reasons (enum-like values)
-- Valid reasons: 'purchase', 'sale', 'return', 'damage', 'loss', 'found', 'transfer', 'manual', 'correction'

SELECT 'Inventory Adjustments table created successfully!' as status;
SELECT 'Valid adjustment reasons: purchase, sale, return, damage, loss, found, transfer, manual, correction' as info; 