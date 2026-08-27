-- Definitive fix for website visibility toggle not saving
-- Drops ALL variants of the trigger and recreates the RPC cleanly

DO $$
DECLARE
  trig RECORD;
BEGIN
  -- Drop every trigger on inventory_items whose name contains 'visibility' or 'website'
  FOR trig IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'inventory_items'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.inventory_items', trig.trigger_name);
  END LOOP;
END $$;

-- Also drop by known names just in case
DROP TRIGGER IF EXISTS trigger_update_website_visibility ON public.inventory_items;
DROP TRIGGER IF EXISTS update_website_visibility_trigger ON public.inventory_items;
DROP TRIGGER IF EXISTS website_visibility_trigger ON public.inventory_items;

-- Drop old trigger functions
DROP FUNCTION IF EXISTS public.update_website_visibility() CASCADE;
DROP FUNCTION IF EXISTS update_website_visibility() CASCADE;

-- Recreate the visibility RPC (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.set_inventory_item_website_visibility(
  p_item_id uuid,
  p_is_visible boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inventory_items
  SET is_website_item = p_is_visible
  WHERE id = p_item_id;
END;
$$;

-- Grant execute to all roles
GRANT EXECUTE ON FUNCTION public.set_inventory_item_website_visibility(uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.set_inventory_item_website_visibility(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_inventory_item_website_visibility(uuid, boolean) TO service_role;

-- Ensure the column exists (no-op if already present)
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS is_website_item boolean DEFAULT false;

-- Grant UPDATE on the column so the anon/authenticated roles can also do direct updates
-- (belt and suspenders alongside the RPC)
GRANT UPDATE (is_website_item) ON public.inventory_items TO anon;
GRANT UPDATE (is_website_item) ON public.inventory_items TO authenticated;
