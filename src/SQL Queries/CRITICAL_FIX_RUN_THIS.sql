-- =====================================================
-- CRITICAL FIX - RUN THIS SCRIPT NOW
-- =====================================================
-- This script will fix the "row-level security policy" error

-- STEP 1: Check if bucket exists
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
        -- Update existing bucket to ensure it's public
        UPDATE storage.buckets 
        SET public = true,
            file_size_limit = 5242880,
            allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        WHERE id = 'product-images';
        RAISE NOTICE 'Bucket already exists, updated settings';
    END IF;
END $$;

-- STEP 2: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;

-- STEP 3: Enable RLS (if not already)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create simple, working policies

-- Policy 1: Allow ANYONE to read from product-images (for public website)
CREATE POLICY "product_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy 2: Allow ANYONE AUTHENTICATED to insert (upload)
CREATE POLICY "product_images_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Policy 3: Allow ANYONE AUTHENTICATED to update
CREATE POLICY "product_images_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Policy 4: Allow ANYONE AUTHENTICATED to delete
CREATE POLICY "product_images_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- STEP 5: Verify policies were created
SELECT 
    '✅ SUCCESS - Policies Created!' as status,
    policyname,
    cmd as operation,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE 'product_images%'
ORDER BY cmd;

-- You should see 4 rows above:
-- 1. product_images_authenticated_delete | DELETE | {authenticated}
-- 2. product_images_authenticated_insert | INSERT | {authenticated}
-- 3. product_images_public_read | SELECT | {public}
-- 4. product_images_authenticated_update | UPDATE | {authenticated}

-- If you see all 4, the setup is complete!
-- Now try uploading an image in the admin panel.



