-- Seed default business row for FK references
INSERT INTO public.businesses (id, name, is_active)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Honey Bee', true)
ON CONFLICT (id) DO NOTHING;
