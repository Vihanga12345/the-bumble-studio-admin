-- Simplify hide form: remove Type, Supplier, Man hours from form
-- Update Animal, Grain, Finishing to new options

-- 1) Make hide_type nullable (removed from form)
ALTER TABLE public.hides
  DROP CONSTRAINT IF EXISTS hides_hide_type_check;

ALTER TABLE public.hides
  ALTER COLUMN hide_type DROP NOT NULL,
  ALTER COLUMN hide_type SET DEFAULT NULL;

-- 2) Update animal_type constraint: Cow, Goat, Ostrich
ALTER TABLE public.hides
  DROP CONSTRAINT IF EXISTS hides_animal_type_check;

UPDATE public.hides
SET animal_type = CASE
  WHEN animal_type IN ('Cow', 'Goat') THEN animal_type
  ELSE 'Cow'
END;

ALTER TABLE public.hides
  ADD CONSTRAINT hides_animal_type_check
  CHECK (animal_type IN ('Cow', 'Goat', 'Ostrich'));

-- 3) Update leather_grain constraint: Full Grain, Top Grain, Genuine Leather
ALTER TABLE public.hides
  DROP CONSTRAINT IF EXISTS hides_leather_grain_check;

UPDATE public.hides
SET leather_grain = CASE
  WHEN leather_grain = 'Full grain' THEN 'Full Grain'
  WHEN leather_grain = 'Top Grain' THEN 'Top Grain'
  ELSE 'Full Grain'
END
WHERE leather_grain IS NOT NULL;

ALTER TABLE public.hides
  ADD CONSTRAINT hides_leather_grain_check
  CHECK (
    leather_grain IS NULL OR leather_grain IN ('Full Grain', 'Top Grain', 'Genuine Leather')
  );

-- 4) Update finishing constraint: Waxed, Oil pullup, Oil, Crazy horse, Full veg, Semi Veg, Chrome tan
ALTER TABLE public.hides
  DROP CONSTRAINT IF EXISTS hides_finishing_check;

UPDATE public.hides
SET finishing = CASE
  WHEN finishing = 'Full Veg tan' THEN 'Full veg'
  WHEN finishing = 'Semi Veg Tan' THEN 'Semi Veg'
  WHEN finishing IN ('Oil', 'Oil pullup', 'crazy horse') THEN finishing
  WHEN finishing = 'Oil wax' THEN 'Oil'
  ELSE 'Full veg'
END;

ALTER TABLE public.hides
  ADD CONSTRAINT hides_finishing_check
  CHECK (finishing IN (
    'Waxed', 'Oil pullup', 'Oil', 'Crazy horse',
    'Full veg', 'Semi Veg', 'Chrome tan'
  ));
