-- Ensure businesses table exists and default business row is present for hides FK
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.businesses (id, name, is_active)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Honey Bee', true)
ON CONFLICT (id) DO NOTHING;
