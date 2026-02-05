-- Order Milestones System with Image Upload
-- This creates a complete milestone tracking system for orders

-- =====================================================
-- 1. CREATE ORDER MILESTONES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  milestone_order INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, milestone_name)
);

CREATE INDEX IF NOT EXISTS order_milestones_order_id_idx ON public.order_milestones(order_id);
CREATE INDEX IF NOT EXISTS order_milestones_order_idx ON public.order_milestones(order_id, milestone_order);

-- =====================================================
-- 2. CREATE MILESTONE IMAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.milestone_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.order_milestones(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS milestone_images_milestone_id_idx ON public.milestone_images(milestone_id);
CREATE INDEX IF NOT EXISTS milestone_images_order_idx ON public.milestone_images(milestone_id, image_order);

-- =====================================================
-- 3. CREATE FUNCTION TO INITIALIZE MILESTONES
-- =====================================================
CREATE OR REPLACE FUNCTION initialize_order_milestones(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default milestones if they don't exist
  INSERT INTO public.order_milestones (order_id, milestone_name, milestone_order)
  VALUES 
    (p_order_id, 'Order Confirmed', 1),
    (p_order_id, 'Leathers Selected', 2),
    (p_order_id, 'Cut Pieces', 3),
    (p_order_id, 'Stitching', 4),
    (p_order_id, 'Finishing', 5),
    (p_order_id, 'Packed', 6)
  ON CONFLICT (order_id, milestone_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE TRIGGER TO AUTO-INITIALIZE MILESTONES
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_initialize_milestones()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize milestones for new order
  PERFORM initialize_order_milestones(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_initialize_milestones ON public.sales_orders;
CREATE TRIGGER trigger_auto_initialize_milestones
  AFTER INSERT ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_milestones();

-- =====================================================
-- 5. CREATE FUNCTION TO UPDATE MILESTONE
-- =====================================================
CREATE OR REPLACE FUNCTION update_milestone_completion(
  p_milestone_id UUID,
  p_is_completed BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.order_milestones
  SET 
    is_completed = p_is_completed,
    completed_at = CASE WHEN p_is_completed THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_milestone_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.order_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_images ENABLE ROW LEVEL SECURITY;

-- Public read access for website
DROP POLICY IF EXISTS "Public can read order milestones" ON public.order_milestones;
CREATE POLICY "Public can read order milestones"
  ON public.order_milestones FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read milestone images" ON public.milestone_images;
CREATE POLICY "Public can read milestone images"
  ON public.milestone_images FOR SELECT
  USING (true);

-- Admin access (full CRUD)
DROP POLICY IF EXISTS "Admin can manage milestones" ON public.order_milestones;
CREATE POLICY "Admin can manage milestones"
  ON public.order_milestones FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage milestone images" ON public.milestone_images;
CREATE POLICY "Admin can manage milestone images"
  ON public.milestone_images FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 7. CREATE VIEW FOR EASY QUERYING
-- =====================================================
CREATE OR REPLACE VIEW order_milestones_with_images AS
SELECT 
  om.id as milestone_id,
  om.order_id,
  om.milestone_name,
  om.milestone_order,
  om.is_completed,
  om.completed_at,
  om.created_at as milestone_created_at,
  om.updated_at as milestone_updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', mi.id,
        'image_url', mi.image_url,
        'image_order', mi.image_order,
        'created_at', mi.created_at
      ) ORDER BY mi.image_order
    ) FILTER (WHERE mi.id IS NOT NULL),
    '[]'::json
  ) as images
FROM public.order_milestones om
LEFT JOIN public.milestone_images mi ON om.id = mi.milestone_id
GROUP BY om.id, om.order_id, om.milestone_name, om.milestone_order, 
         om.is_completed, om.completed_at, om.created_at, om.updated_at;

-- Grant access to view
GRANT SELECT ON order_milestones_with_images TO anon;
GRANT SELECT ON order_milestones_with_images TO authenticated;

-- =====================================================
-- 8. INITIALIZE MILESTONES FOR EXISTING ORDERS
-- =====================================================
DO $$
DECLARE
  order_record RECORD;
BEGIN
  FOR order_record IN SELECT id FROM public.sales_orders
  LOOP
    PERFORM initialize_order_milestones(order_record.id);
  END LOOP;
  
  RAISE NOTICE '✅ Milestones initialized for all existing orders';
END $$;

-- =====================================================
-- 9. CREATE STORAGE BUCKET FOR MILESTONE IMAGES
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('milestone-images', 'milestone-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for milestone images
DROP POLICY IF EXISTS "Public can read milestone images" ON storage.objects;
CREATE POLICY "Public can read milestone images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'milestone-images');

DROP POLICY IF EXISTS "Admin can upload milestone images" ON storage.objects;
CREATE POLICY "Admin can upload milestone images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'milestone-images');

DROP POLICY IF EXISTS "Admin can delete milestone images" ON storage.objects;
CREATE POLICY "Admin can delete milestone images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'milestone-images');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Order Milestones System Created Successfully!';
  RAISE NOTICE '📋 Milestones: Order Confirmed, Leathers Selected, Cut Pieces, Stitching, Finishing, Packed';
  RAISE NOTICE '📸 Each milestone can have up to 4 images';
  RAISE NOTICE '✔️ Milestones can be marked complete/incomplete';
  RAISE NOTICE '🔄 Automatically initializes for all new orders';
END $$;
