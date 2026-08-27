-- Ensure trigger is gone and RPC is callable by anon
DROP TRIGGER IF EXISTS trigger_update_website_visibility ON public.inventory_items;
DROP FUNCTION IF EXISTS update_website_visibility();

-- Grant execute so anon key can call the RPC
GRANT EXECUTE ON FUNCTION public.set_inventory_item_website_visibility(uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.set_inventory_item_website_visibility(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_inventory_item_website_visibility(uuid, boolean) TO service_role;
