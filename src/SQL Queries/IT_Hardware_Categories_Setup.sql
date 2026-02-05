-- =====================================================
-- IT HARDWARE CATEGORIES SETUP
-- Create category lookup table for consistent categories
-- =====================================================

-- Create categories table for lookup values
CREATE TABLE IF NOT EXISTS public.item_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert IT Hardware Categories
INSERT INTO public.item_categories (category_name, description, icon_name, display_order) VALUES
('Laptops', 'Portable computers and notebooks', '💻', 1),
('Desktop PCs', 'Desktop computers and workstations', '🖥️', 2),
('Monitors', 'Computer monitors and displays', '📺', 3),
('Keyboards', 'Computer keyboards and keypads', '⌨️', 4),
('Mice & Pointing', 'Computer mice and pointing devices', '🖱️', 5),
('Speakers & Audio', 'Computer speakers and audio equipment', '🔊', 6),
('Headphones', 'Headphones and headsets', '🎧', 7),
('Webcams', 'Web cameras and video equipment', '📹', 8),
('Storage Devices', 'Hard drives, SSDs, and storage', '💾', 9),
('Memory (RAM)', 'Computer memory modules', '🧠', 10),
('Graphics Cards', 'Video cards and graphics processors', '🎮', 11),
('Processors', 'CPUs and processors', '⚡', 12),
('Motherboards', 'Computer motherboards', '🔌', 13),
('Power Supplies', 'Computer power supplies', '🔋', 14),
('Cases & Cooling', 'Computer cases and cooling systems', '❄️', 15),
('Cables & Adapters', 'Computer cables and adapters', '🔗', 16),
('Networking', 'Network equipment and devices', '🌐', 17),
('Printers', 'Printers and printing equipment', '🖨️', 18),
('Tablets', 'Tablets and mobile devices', '📱', 19),
('Accessories', 'Computer accessories and peripherals', '🔧', 20)
ON CONFLICT (category_name) DO NOTHING;

-- Update existing inventory items to use proper categories (optional)
-- This will help categorize any existing products
UPDATE public.inventory_items 
SET category = 'Laptops' 
WHERE category IS NULL OR category = '' OR category = 'Uncategorized'
AND (name ILIKE '%laptop%' OR name ILIKE '%notebook%');

UPDATE public.inventory_items 
SET category = 'Desktop PCs' 
WHERE category IS NULL OR category = '' OR category = 'Uncategorized'
AND (name ILIKE '%desktop%' OR name ILIKE '%pc%' OR name ILIKE '%computer%');

UPDATE public.inventory_items 
SET category = 'Monitors' 
WHERE category IS NULL OR category = '' OR category = 'Uncategorized'
AND (name ILIKE '%monitor%' OR name ILIKE '%display%' OR name ILIKE '%screen%');

UPDATE public.inventory_items 
SET category = 'Keyboards' 
WHERE category IS NULL OR category = '' OR category = 'Uncategorized'
AND name ILIKE '%keyboard%';

UPDATE public.inventory_items 
SET category = 'Mice & Pointing' 
WHERE category IS NULL OR category = '' OR category = 'Uncategorized'
AND (name ILIKE '%mouse%' OR name ILIKE '%mice%');

-- Create a function to get categories for dropdown
CREATE OR REPLACE FUNCTION get_item_categories()
RETURNS TABLE(value VARCHAR, label VARCHAR)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        category_name as value,
        category_name as label
    FROM public.item_categories 
    WHERE is_active = true 
    ORDER BY display_order, category_name;
$$;

-- Grant permissions
GRANT SELECT ON public.item_categories TO authenticated;
GRANT EXECUTE ON FUNCTION get_item_categories() TO authenticated;

SELECT 'IT Hardware Categories Setup Complete!' as status;
SELECT COUNT(*) as total_categories FROM public.item_categories WHERE is_active = true; 