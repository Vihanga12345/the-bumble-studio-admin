-- =====================================================
-- SIMPLE STORAGE BUCKET CREATION
-- =====================================================
-- Run this FIRST if you haven't created the bucket yet
-- This is the simplest version - just creates the bucket

-- Create the bucket (will fail if it already exists - that's OK)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- After running this, run Fix_Storage_Policies.sql
-- =====================================================



