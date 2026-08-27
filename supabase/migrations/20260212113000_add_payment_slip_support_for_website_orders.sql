-- Add payment slip fields for website checkout flow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'payment_slip_url'
  ) THEN
    ALTER TABLE public.sales_orders ADD COLUMN payment_slip_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'payment_slip_name'
  ) THEN
    ALTER TABLE public.sales_orders ADD COLUMN payment_slip_name text;
  END IF;
END $$;

-- Storage bucket for website payment slip uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-slips', 'payment-slips', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can upload payment slips'
  ) THEN
    CREATE POLICY "Public can upload payment slips"
    ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'payment-slips');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can read payment slips'
  ) THEN
    CREATE POLICY "Public can read payment slips"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'payment-slips');
  END IF;
END $$;
