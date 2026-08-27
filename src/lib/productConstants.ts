export const PRODUCT_CATEGORIES = [
  'Wallets',
  'Belts',
  'Bags',
  'Clutch Wallets',
  'Watch Straps',
  'Accessories',
  'Other',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_FEATURE_FIELDS = [
  { key: 'dimensions', label: 'Dimensions', placeholder: 'e.g. 11.5 × 8.5 × 1.2 cm' },
  { key: 'cardSlots', label: 'Card Slots', placeholder: 'e.g. 8 card slots' },
  { key: 'profile', label: 'Profile', placeholder: 'e.g. Slim bifold' },
  { key: 'material', label: 'Material', placeholder: 'e.g. Full-grain vegetable-tanned leather' },
  { key: 'stitching', label: 'Stitching', placeholder: 'e.g. Hand-stitched saddle stitch' },
  { key: 'hardware', label: 'Hardware', placeholder: 'e.g. Solid brass buckle' },
] as const;

export type ProductFeatures = {
  dimensions: string;
  cardSlots: string;
  profile: string;
  material: string;
  stitching: string;
  hardware: string;
  aboutThisProduct: string;
};

export const emptyProductFeatures = (): ProductFeatures => ({
  dimensions: '',
  cardSlots: '',
  profile: '',
  material: '',
  stitching: '',
  hardware: '',
  aboutThisProduct: '',
});

export function parseItemSpecifications(raw: unknown): { features: string; productFeatures: ProductFeatures } {
  const productFeatures = emptyProductFeatures();
  if (!raw || raw === '{}') return { features: '', productFeatures };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') {
      const pf = parsed.productFeatures || {};
      return {
        features: Array.isArray(parsed.features)
          ? parsed.features.join('\n')
          : (typeof parsed.features === 'string' ? parsed.features : ''),
        productFeatures: {
          dimensions: pf.dimensions || parsed.dimensions || '',
          cardSlots: pf.cardSlots || '',
          profile: pf.profile || '',
          material: pf.material || '',
          stitching: pf.stitching || '',
          hardware: pf.hardware || '',
          aboutThisProduct: pf.aboutThisProduct || '',
        },
      };
    }
  } catch {
    if (typeof raw === 'string') return { features: raw, productFeatures };
  }
  return { features: '', productFeatures };
}

export function serializeItemSpecifications(features: string, productFeatures: ProductFeatures): string {
  return JSON.stringify({
    features: features.split('\n').map((line) => line.trim()).filter(Boolean),
    productFeatures,
  });
}

export function resolveProductCategory(category?: string | null): string {
  if (!category || category === 'Leather Products' || category === 'Raw Materials') {
    return 'Wallets';
  }
  return category;
}
