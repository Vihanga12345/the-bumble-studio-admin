-- Fix is_website_item for specific item (trigger already dropped by 20260226120000)
DROP TRIGGER IF EXISTS trigger_update_website_visibility ON public.inventory_items;
DROP FUNCTION IF EXISTS update_website_visibility() CASCADE;
UPDATE public.inventory_items SET is_website_item = false WHERE id = '198c87f9-1faa-42a6-b891-7c9e1de27b1b';