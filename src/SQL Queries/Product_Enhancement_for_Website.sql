-- ================================================
-- PRODUCT ENHANCEMENT FOR WEBSITE INTEGRATION
-- ================================================
-- This script enhances the inventory_items table to support:
-- 1. Website sale item checkbox functionality
-- 2. Image upload capability
-- 3. Enhanced product display for e-commerce
-- 4. Stock-based visibility control

-- ================================================
-- 1. ADD NEW COLUMNS TO INVENTORY_ITEMS TABLE
-- ================================================

-- Add website sale item flag
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'is_website_item'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN is_website_item BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_website_item column to inventory_items table';
    END IF;
END $$;

-- Add image URL column for product images
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to inventory_items table';
    END IF;
END $$;

-- Add additional image URLs for multiple product images
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'additional_images'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN additional_images JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added additional_images column to inventory_items table';
    END IF;
END $$;

-- Add detailed product specifications for website display
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'specifications'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN specifications JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added specifications column to inventory_items table';
    END IF;
END $$;

-- Add product weight for shipping calculations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'weight'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN weight DECIMAL(8,3) DEFAULT 0;
        RAISE NOTICE 'Added weight column to inventory_items table';
    END IF;
END $$;

-- Add product dimensions for shipping calculations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'dimensions'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN dimensions JSONB DEFAULT '{"length": 0, "width": 0, "height": 0}'::jsonb;
        RAISE NOTICE 'Added dimensions column to inventory_items table';
    END IF;
END $$;

-- Add SEO-friendly URL slug for products
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'url_slug'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN url_slug TEXT;
        RAISE NOTICE 'Added url_slug column to inventory_items table';
    END IF;
END $$;

-- Add meta description for SEO
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'meta_description'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN meta_description TEXT;
        RAISE NOTICE 'Added meta_description column to inventory_items table';
    END IF;
END $$;

-- Add featured product flag
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN is_featured BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_featured column to inventory_items table';
    END IF;
END $$;

-- Add sale price for promotional pricing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'sale_price'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN sale_price DECIMAL(10,2);
        RAISE NOTICE 'Added sale_price column to inventory_items table';
    END IF;
END $$;

-- ================================================
-- 2. UPDATE EXISTING E-COMMERCE PRODUCTS
-- ================================================

-- Update existing e-commerce products to be website items
UPDATE inventory_items 
SET 
    is_website_item = true,
    image_url = '/placeholder.svg?height=400&width=400',
    is_featured = CASE 
        WHEN sku IN ('WEB-HEAD-001', 'WEB-MON-UW-001', 'WEB-SPEAK-001', 'WEB-WATCH-001') THEN true 
        ELSE false 
    END,
    specifications = CASE sku
        WHEN 'WEB-HEAD-001' THEN '["Active Noise Cancellation", "40-hour battery life", "Bluetooth 5.0 connectivity", "Premium comfort design", "Built-in microphone"]'::jsonb
        WHEN 'WEB-KB-GAM-001' THEN '["Mechanical switches", "RGB backlighting", "Anti-ghosting technology", "Programmable keys", "USB connectivity"]'::jsonb
        WHEN 'WEB-MON-UW-001' THEN '["34-inch curved display", "3440 x 1440 resolution", "144Hz refresh rate", "HDR support", "Multiple connectivity options"]'::jsonb
        WHEN 'WEB-CASE-001' THEN '["Wireless charging compatible", "Drop protection up to 10 feet", "Premium materials", "Precise cutouts", "Easy installation"]'::jsonb
        WHEN 'WEB-SPEAK-001' THEN '["Waterproof design (IPX7)", "12-hour battery life", "360-degree sound", "Bluetooth 5.0", "Built-in microphone"]'::jsonb
        WHEN 'WEB-HUB-001' THEN '["7-in-1 connectivity", "4K HDMI output", "USB 3.0 ports", "SD card reader", "Compact design"]'::jsonb
        WHEN 'WEB-PAD-001' THEN '["Large surface area", "Wrist support cushion", "Non-slip base", "Easy to clean", "Durable stitched edges"]'::jsonb
        WHEN 'WEB-CAM-001' THEN '["1080p Full HD", "Auto-focus technology", "Built-in microphone", "Plug and play", "Privacy shutter"]'::jsonb
        WHEN 'WEB-PWR-001' THEN '["20000mAh capacity", "Fast charging support", "Multiple device charging", "LED power indicator", "Compact and lightweight"]'::jsonb
        WHEN 'WEB-WATCH-001' THEN '["Heart rate monitoring", "GPS tracking", "7-day battery life", "Water resistant", "Multiple workout modes"]'::jsonb
        ELSE '{}'::jsonb
    END,
    weight = CASE sku
        WHEN 'WEB-HEAD-001' THEN 0.250
        WHEN 'WEB-KB-GAM-001' THEN 1.200
        WHEN 'WEB-MON-UW-001' THEN 8.500
        WHEN 'WEB-CASE-001' THEN 0.050
        WHEN 'WEB-SPEAK-001' THEN 0.600
        WHEN 'WEB-HUB-001' THEN 0.150
        WHEN 'WEB-PAD-001' THEN 0.300
        WHEN 'WEB-CAM-001' THEN 0.200
        WHEN 'WEB-PWR-001' THEN 0.450
        WHEN 'WEB-WATCH-001' THEN 0.080
        ELSE 0
    END
WHERE sku LIKE 'WEB-%' AND business_id = '550e8400-e29b-41d4-a716-446655440000';

-- ================================================
-- 3. CREATE VIEW FOR WEBSITE PRODUCTS
-- ================================================

-- View for website products with all necessary information
CREATE OR REPLACE VIEW website_products_view AS
SELECT 
    i.id,
    i.sku,
    i.name,
    i.description,
    i.selling_price,
    i.sale_price,
    i.current_stock,
    i.image_url,
    i.additional_images,
    i.specifications,
    i.weight,
    i.dimensions,
    i.is_featured,
    i.meta_description,
    i.url_slug,
    i.created_at,
    i.updated_at,
    i.category,
    CASE 
        WHEN i.sale_price IS NOT NULL 
        THEN true 
        ELSE false 
    END as is_on_sale,
    CASE 
        WHEN i.sale_price IS NOT NULL 
        THEN i.sale_price 
        ELSE i.selling_price 
    END as effective_price
FROM inventory_items i
WHERE i.is_website_item = true 
    AND i.is_active = true 
    AND i.current_stock > 0
    AND i.business_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY i.is_featured DESC, i.created_at DESC;

-- View for featured products
CREATE OR REPLACE VIEW featured_products_view AS
SELECT * FROM website_products_view 
WHERE is_featured = true 
ORDER BY created_at DESC;

-- View for products on sale
CREATE OR REPLACE VIEW sale_products_view AS
SELECT * FROM website_products_view 
WHERE is_on_sale = true 
ORDER BY created_at DESC;

-- ================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ================================================

-- Indexes for website product queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_website_item ON inventory_items(is_website_item) WHERE is_website_item = true;
CREATE INDEX IF NOT EXISTS idx_inventory_items_featured ON inventory_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(current_stock) WHERE current_stock > 0;
CREATE INDEX IF NOT EXISTS idx_inventory_items_active_website ON inventory_items(is_active, is_website_item, current_stock);

-- ================================================
-- 5. VERIFICATION AND SUCCESS MESSAGE
-- ================================================

-- Verify the product enhancement setup
SELECT 
    'Product Enhancement Complete' as component,
    'Website Integration Ready' as status,
    NOW() as completed_at,
    (
        SELECT COUNT(*) FROM inventory_items 
        WHERE is_website_item = true 
        AND business_id = '550e8400-e29b-41d4-a716-446655440000'
    ) as website_products_count;

-- ================================================
-- END OF PRODUCT ENHANCEMENT FOR WEBSITE INTEGRATION
-- ================================================ 