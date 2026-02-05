-- =====================================================
-- FIX STORAGE POLICIES FOR ANON USERS (ERP SYSTEM)
-- =====================================================
-- This allows the admin portal to upload images using the anon key
-- since users authenticate through the custom ERP system

-- STEP 1: Ensure bucket exists and is public
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-images') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'product-images',
            'product-images',
            true,
            5242880,
            ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        );
        RAISE NOTICE 'Bucket created successfully';
    ELSE
        UPDATE storage.buckets 
        SET public = true,
            file_size_limit = 5242880,
            allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        WHERE id = 'product-images';
        RAISE NOTICE 'Bucket already exists, updated to public';
    END IF;
END $$;

-- STEP 2: Drop existing policies
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "product_images_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_anon_delete" ON storage.objects;

-- STEP 3: Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create policies that work with anon key

-- Allow public read (for website visitors)
CREATE POLICY "product_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow anon users to insert (admin portal users with anon key)
CREATE POLICY "product_images_anon_insert"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'product-images');

-- Allow anon users to update
CREATE POLICY "product_images_anon_update"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Allow anon users to delete
CREATE POLICY "product_images_anon_delete"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'product-images');

-- Also allow authenticated users (in case of future Supabase Auth integration)
CREATE POLICY "product_images_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- STEP 5: Verify setup
SELECT 
    '✅ Storage Policies Created!' as status,
    policyname,
    cmd as operation,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE 'product_images%'
ORDER BY policyname;





