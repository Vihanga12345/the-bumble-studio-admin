-- =====================================================
-- Create Storage Bucket for Product Images
-- =====================================================
-- This script creates a Supabase Storage bucket for product images
-- and sets up the necessary policies for public access

-- Step 1: Create the storage bucket
-- Note: Run this in Supabase Dashboard -> Storage -> Create new bucket
-- Bucket name: product-images
-- Public: Yes (so images can be accessed from the public website)

-- Step 2: Set up storage policies
-- Allow authenticated users (admin) to upload images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,  -- Public bucket so images can be viewed on the website
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Step 3: Create storage policies

-- First, remove any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

-- Policy 1: Allow anyone to read/view images (for public website)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Policy 2: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 3: Allow authenticated users to update their images
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 4: Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- =====================================================
-- How to use in Supabase Dashboard:
-- =====================================================
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Storage section
-- 3. Click "New bucket"
-- 4. Name it "product-images"
-- 5. Make it Public
-- 6. Set max file size to 5MB
-- 7. Then run the policy creation SQL in SQL Editor

-- =====================================================
-- Image URL Format:
-- =====================================================
-- After uploading, images will be accessible at:
-- https://[your-project-ref].supabase.co/storage/v1/object/public/product-images/[filename]

