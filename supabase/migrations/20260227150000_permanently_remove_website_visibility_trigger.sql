-- Permanently remove trigger that overrides is_website_item
-- Run order: drop trigger first, then function (function CASCADE also drops triggers)
DO $$
BEGIN
  -- Drop trigger on public schema
  DROP TRIGGER IF EXISTS trigger_update_website_visibility ON public.inventory_items;
  -- Drop function - CASCADE removes any dependent triggers
  DROP FUNCTION IF EXISTS public.update_website_visibility() CASCADE;
  DROP FUNCTION IF EXISTS update_website_visibility() CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cleanup: %', SQLERRM;
END $$;
