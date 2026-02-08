-- Migration: Create order_images table for order-level image uploads
-- This replaces the milestone_images table to allow up to 8 images per order

-- Create order_images table
CREATE TABLE IF NOT EXISTS order_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_order INTEGER NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    UNIQUE(order_id, image_order)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_images_order_id ON order_images(order_id);
CREATE INDEX IF NOT EXISTS idx_order_images_order ON order_images(order_id, image_order);

-- Add RLS policies
ALTER TABLE order_images ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all order images
CREATE POLICY "Allow authenticated users to read order images"
    ON order_images
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert order images
CREATE POLICY "Allow authenticated users to insert order images"
    ON order_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update their own order images
CREATE POLICY "Allow authenticated users to update order images"
    ON order_images
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete order images
CREATE POLICY "Allow authenticated users to delete order images"
    ON order_images
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions
GRANT ALL ON order_images TO authenticated;
GRANT ALL ON order_images TO service_role;

COMMENT ON TABLE order_images IS 'Stores up to 8 images per order for tracking crafting progress';
