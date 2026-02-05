-- =====================================================
-- VERIFY STORAGE SETUP
-- =====================================================
-- Run this script to check if your storage is set up correctly
-- This will show you what's configured and what's missing

-- Check 1: Does the bucket exist?
SELECT 
  'Bucket Check' as check_type,
  id as bucket_id,
  name as bucket_name,
  public as is_public,
  file_size_limit,
  allowed_mime_types,
  CASE 
    WHEN id = 'product-images' AND public = true THEN '✅ Bucket configured correctly'
    WHEN id = 'product-images' AND public = false THEN '❌ Bucket exists but is NOT PUBLIC - Go to Storage settings and make it public'
    ELSE '✅ Bucket found'
  END as status
FROM storage.buckets
WHERE id = 'product-images';

-- If you see NO RESULTS above, the bucket doesn't exist!
-- Run: Create_Storage_Bucket_Simple.sql or create it via UI

-- Check 2: What policies exist?
SELECT 
  'Policy Check' as check_type,
  policyname as policy_name,
  cmd as operation,
  roles,
  CASE 
    WHEN cmd = 'SELECT' AND 'public' = ANY(roles) THEN '✅ Public read enabled'
    WHEN cmd = 'INSERT' AND 'authenticated' = ANY(roles) THEN '✅ Authenticated upload enabled'
    WHEN cmd = 'UPDATE' AND 'authenticated' = ANY(roles) THEN '✅ Authenticated update enabled'
    WHEN cmd = 'DELETE' AND 'authenticated' = ANY(roles) THEN '✅ Authenticated delete enabled'
    ELSE '⚠️ Policy exists but may need review'
  END as status
FROM pg_policies 
WHERE tablename = 'objects' 
  AND (
    policyname LIKE '%product-images%' 
    OR policyname LIKE '%authenticated%' 
    OR policyname LIKE '%public%'
  )
ORDER BY cmd;

-- Expected Results:
-- You should see:
-- 1. One bucket row with is_public = true
-- 2. Four policy rows:
--    - SELECT with public role
--    - INSERT with authenticated role
--    - UPDATE with authenticated role
--    - DELETE with authenticated role

-- If you see less than 4 policies, run: Fix_Storage_Policies.sql

-- Check 3: Is RLS enabled on storage.objects?
SELECT 
  'RLS Check' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS is enabled (correct)'
    ELSE '❌ RLS is disabled (this might cause issues)'
  END as status
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- =====================================================
-- INTERPRETATION
-- =====================================================
-- ✅ If you see:
--    - 1 bucket (product-images, public = true)
--    - 4 policies (1 SELECT for public, 3 for authenticated)
--    - RLS enabled
-- THEN: Your storage is configured correctly! Try uploading again.

-- ❌ If you see:
--    - NO bucket: Run Create_Storage_Bucket_Simple.sql
--    - Bucket but not public: Go to Storage → Settings → Check "Public bucket"
--    - Less than 4 policies: Run Fix_Storage_Policies.sql
--    - RLS disabled: Run Fix_Storage_Policies.sql

-- =====================================================
-- QUICK FIX
-- =====================================================
-- If anything is wrong, run this one-line fix:
-- Run: Fix_Storage_Policies.sql (it handles everything)

