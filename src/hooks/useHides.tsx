import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Hide, HideAnimalType, HideFinishing, HideLeatherGrain, PurchaseOrderHideLink, SalesOrderHideLink } from '@/types';

const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

const toHide = (row: any): Hide => ({
  id: row.id,
  hideName: row.hide_name,
  isAvailable: row.is_available,
  sqFeet: Number(row.sq_feet || 0),
  supplierId: row.supplier_id,
  supplierName: row.suppliers?.name || undefined,
  price: Number(row.price || 0),
  estimatedProductsToBeMade: Number(row.estimated_products_to_be_made || 1),
  costPerProduct: Number(row.cost_per_product || 0),
  animalType: (row.animal_type || 'Cow') as HideAnimalType,
  leatherGrain: (row.leather_grain || null) as HideLeatherGrain | null,
  country: row.country || null,
  hideType: row.hide_type || null,
  finishing: row.finishing as HideFinishing,
  manHours: Number(row.man_hours || 0),
  notes: row.notes || '',
  imageUrls: (Array.isArray(row.hide_images) ? row.hide_images : [])
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img: any) => img?.image_url)
    .filter(Boolean),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export function useHides() {
  const [hides, setHides] = useState<Hide[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHides = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('hides')
        .select(`
          *,
          suppliers(name),
          hide_images(image_url, sort_order)
        `)
        .eq('business_id', BUSINESS_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHides((data || []).map(toHide));
    } catch (error) {
      console.error('Error fetching hides:', error);
      toast.error('Failed to load hides');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHides();
  }, [fetchHides]);

  const getHideById = useCallback(
    (id: string) => hides.find((hide) => hide.id === id),
    [hides]
  );

  const createHide = useCallback(
    async (payload: Omit<Hide, 'id' | 'createdAt' | 'updatedAt' | 'supplierName'>) => {
      const { imageUrls = [], ...hideData } = payload;
      const { data, error } = await (supabase as any)
        .from('hides')
        .insert({
          business_id: BUSINESS_ID,
          hide_name: hideData.hideName,
          is_available: hideData.isAvailable,
          sq_feet: hideData.sqFeet,
          supplier_id: null,
          price: hideData.price,
          estimated_products_to_be_made: hideData.estimatedProductsToBeMade,
          animal_type: hideData.animalType || 'Cow',
          leather_grain: hideData.leatherGrain || null,
          country: hideData.country || null,
          hide_type: 'Full grain',
          finishing: hideData.finishing,
          man_hours: 0,
          notes: hideData.notes || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      if (imageUrls.length > 0) {
        const { error: imageError } = await (supabase as any).from('hide_images').insert(
          imageUrls.slice(0, 5).map((url, index) => ({
            hide_id: data.id,
            image_url: url,
            sort_order: index,
          }))
        );
        if (imageError) throw imageError;
      }

      await fetchHides();
      toast.success('Hide created successfully');
      return data.id as string;
    },
    [fetchHides]
  );

  const updateHide = useCallback(
    async (id: string, payload: Partial<Omit<Hide, 'id' | 'createdAt' | 'updatedAt' | 'supplierName'>>) => {
      const updateData: Record<string, any> = {};
      if (payload.hideName !== undefined) updateData.hide_name = payload.hideName;
      if (payload.isAvailable !== undefined) updateData.is_available = payload.isAvailable;
      if (payload.sqFeet !== undefined) updateData.sq_feet = payload.sqFeet;
      if (payload.supplierId !== undefined) updateData.supplier_id = payload.supplierId || null;
      if (payload.price !== undefined) updateData.price = payload.price;
      if (payload.estimatedProductsToBeMade !== undefined) updateData.estimated_products_to_be_made = payload.estimatedProductsToBeMade;
      if (payload.animalType !== undefined) updateData.animal_type = payload.animalType;
      if (payload.leatherGrain !== undefined) updateData.leather_grain = payload.leatherGrain || null;
      if (payload.country !== undefined) updateData.country = payload.country || null;
      if (payload.hideType !== undefined) updateData.hide_type = payload.hideType;
      if (payload.finishing !== undefined) updateData.finishing = payload.finishing;
      if (payload.manHours !== undefined) updateData.man_hours = payload.manHours;
      if (payload.notes !== undefined) updateData.notes = payload.notes || null;

      const { error } = await (supabase as any).from('hides').update(updateData).eq('id', id);
      if (error) throw error;

      if (payload.imageUrls) {
        const nextImages = payload.imageUrls.slice(0, 5);
        const { error: deleteErr } = await (supabase as any).from('hide_images').delete().eq('hide_id', id);
        if (deleteErr) throw deleteErr;

        if (nextImages.length > 0) {
          const { error: insertErr } = await (supabase as any).from('hide_images').insert(
            nextImages.map((url, index) => ({
              hide_id: id,
              image_url: url,
              sort_order: index,
            }))
          );
          if (insertErr) throw insertErr;
        }
      }

      await fetchHides();
      toast.success('Hide updated successfully');
    },
    [fetchHides]
  );

  const linkHidesToPurchaseOrder = useCallback(async (purchaseOrderId: string, links: PurchaseOrderHideLink[]) => {
    if (!links.length) return;
    const { error } = await (supabase as any).from('purchase_order_hides').insert(
      links.map((link) => ({
        purchase_order_id: purchaseOrderId,
        hide_id: link.hideId,
        quantity: link.quantity,
        unit_price: link.unitPrice,
        notes: link.notes || null,
      }))
    );
    if (error) throw error;
  }, []);

  const linkHidesToSalesOrder = useCallback(async (salesOrderId: string, links: SalesOrderHideLink[]) => {
    if (!links.length) return;
    const { error } = await (supabase as any).from('sales_order_hides').insert(
      links.map((link) => ({
        sales_order_id: salesOrderId,
        hide_id: link.hideId,
        product_id: link.productId || null,
        quantity: link.quantity,
        man_hours: link.manHours,
        notes: link.notes || null,
      }))
    );
    if (error) throw error;
  }, []);

  const getAvailableHides = useCallback(() => hides.filter((hide) => hide.isAvailable), [hides]);

  const deleteHide = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).from('hide_images').delete().eq('hide_id', id);
      if (error) throw error;
      const { error: hideError } = await (supabase as any).from('hides').delete().eq('id', id);
      if (hideError) throw hideError;
      await fetchHides();
      toast.success('Hide deleted successfully');
    },
    [fetchHides]
  );

  return {
    hides,
    isLoading,
    fetchHides,
    getHideById,
    createHide,
    updateHide,
    getAvailableHides,
    linkHidesToPurchaseOrder,
    linkHidesToSalesOrder,
    deleteHide,
  };
}
