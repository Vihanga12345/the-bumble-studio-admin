-- Customer reviews: image + remark, latest 10 displayed, oldest auto-deleted
CREATE TABLE IF NOT EXISTS public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  remark text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: allow public read and insert
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read customer reviews" ON public.customer_reviews;
CREATE POLICY "Public can read customer reviews"
  ON public.customer_reviews FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can insert customer reviews" ON public.customer_reviews;
CREATE POLICY "Public can insert customer reviews"
  ON public.customer_reviews FOR INSERT TO public WITH CHECK (true);

-- Storage bucket for customer review images
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-reviews', 'customer-reviews', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public can upload customer review images" ON storage.objects;
CREATE POLICY "Public can upload customer review images"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'customer-reviews');

DROP POLICY IF EXISTS "Public can read customer review images" ON storage.objects;
CREATE POLICY "Public can read customer review images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'customer-reviews');
