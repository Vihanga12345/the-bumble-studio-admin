-- Website hide-selection enhancements
-- 1) Enrich hides with animal/leather-grain metadata
-- 2) Link selling items with allowed active hides

ALTER TABLE public.hides
  ADD COLUMN IF NOT EXISTS animal_type text NOT NULL DEFAULT 'Cow';

ALTER TABLE public.hides
  ADD COLUMN IF NOT EXISTS leather_grain text;

ALTER TABLE public.hides
  DROP CONSTRAINT IF EXISTS hides_animal_type_check;

ALTER TABLE public.hides
  ADD CONSTRAINT hides_animal_type_check
  CHECK (animal_type IN ('Goat', 'Cow', 'Buffalo', 'Other'));

ALTER TABLE public.hides
  DROP CONSTRAINT IF EXISTS hides_leather_grain_check;

ALTER TABLE public.hides
  ADD CONSTRAINT hides_leather_grain_check
  CHECK (
    leather_grain IS NULL OR leather_grain IN ('Full grain', 'Top Grain')
  );

UPDATE public.hides
SET
  animal_type = COALESCE(NULLIF(animal_type, ''), 'Cow'),
  leather_grain = CASE
    WHEN leather_grain IS NOT NULL THEN leather_grain
    WHEN hide_type IN ('Full grain', 'Top Grain') THEN hide_type
    ELSE NULL
  END;

CREATE TABLE IF NOT EXISTS public.inventory_item_hides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  hide_id uuid NOT NULL REFERENCES public.hides(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inventory_item_id, hide_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_item_hides_item
  ON public.inventory_item_hides(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_item_hides_hide
  ON public.inventory_item_hides(hide_id);

CREATE OR REPLACE FUNCTION public.set_updated_at_inventory_item_hides()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_item_hides_set_updated_at ON public.inventory_item_hides;
CREATE TRIGGER trg_inventory_item_hides_set_updated_at
BEFORE UPDATE ON public.inventory_item_hides
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_inventory_item_hides();
