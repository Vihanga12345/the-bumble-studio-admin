-- Purchase order images table (up to 5 images per PO)
CREATE TABLE IF NOT EXISTS public.purchase_order_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_images_po_id ON public.purchase_order_images(purchase_order_id);

ALTER TABLE public.purchase_order_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read purchase order images" ON public.purchase_order_images;
CREATE POLICY "Public can read purchase order images"
  ON public.purchase_order_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert purchase order images" ON public.purchase_order_images;
CREATE POLICY "Public can insert purchase order images"
  ON public.purchase_order_images FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update purchase order images" ON public.purchase_order_images;
CREATE POLICY "Public can update purchase order images"
  ON public.purchase_order_images FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete purchase order images" ON public.purchase_order_images;
CREATE POLICY "Public can delete purchase order images"
  ON public.purchase_order_images FOR DELETE USING (true);
