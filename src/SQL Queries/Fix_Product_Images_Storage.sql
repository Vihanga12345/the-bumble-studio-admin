-- Fix Product Images Storage Bucket and RLS Policies
-- This script creates the bucket and sets up proper permissions for ERP users

-- Create the product-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on the storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "ERP users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "ERP users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "ERP users can delete product images" ON storage.objects;

-- Policy 1: Allow ERP users to upload images to product-images bucket
CREATE POLICY "ERP users can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND EXISTS (
    SELECT 1 FROM public.erp_users
    WHERE erp_users.id = auth.uid()
  )
);

-- Policy 2: Allow anyone to view product images (public bucket)
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy 3: Allow ERP users to update product images
CREATE POLICY "ERP users can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.erp_users
    WHERE erp_users.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.erp_users
    WHERE erp_users.id = auth.uid()
  )
);

-- Policy 4: Allow ERP users to delete product images
CREATE POLICY "ERP users can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.erp_users
    WHERE erp_users.id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Success message
-- Product images storage bucket is now configured with proper RLS policies
-- ERP users can now upload, view, update, and delete product images
