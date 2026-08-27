-- Drop trigger that overrides is_website_item based on stock
-- Users should have manual control over website visibility for selling items
DROP TRIGGER IF EXISTS trigger_update_website_visibility ON public.inventory_items;
DROP FUNCTION IF EXISTS update_website_visibility();
