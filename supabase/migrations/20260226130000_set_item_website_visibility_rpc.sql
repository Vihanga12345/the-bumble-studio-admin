-- RPC to set is_website_item - drops trigger first to ensure manual control works
CREATE OR REPLACE FUNCTION public.set_inventory_item_website_visibility(p_item_id uuid, p_is_visible boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_update_website_visibility ON public.inventory_items;
  UPDATE public.inventory_items SET is_website_item = p_is_visible WHERE id = p_item_id;
END;
$$;
