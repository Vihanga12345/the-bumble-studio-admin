import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem, InventoryAdjustment, AdjustmentReason, UnitOfMeasure, ItemType, ItemCategory, ItemLink, LinkedItemInfo, ProductType } from '@/types';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [itemLinks, setItemLinks] = useState<ItemLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', '550e8400-e29b-41d4-a716-446655440000')
        .order('name', { ascending: true });

      if (error) throw error;

      const transformedItems: InventoryItem[] = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        category: item.category || '',
        unitOfMeasure: item.unit_of_measure as UnitOfMeasure,
        purchaseCost: item.purchase_cost,
        sellingPrice: item.selling_price,
        currentStock: item.current_stock,
        reorderLevel: item.reorder_level,
        sku: item.sku || '',
        isActive: item.is_active,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        isVariant: item.is_variant || false,
        parentItemId: item.parent_item_id || null,
        variantName: item.variant_name || '',
        // Item Type field
        itemType: (item.item_type as ItemType) || 'Materials',
        // Item Category field (Selling or Crafting)
        itemCategory: (item.item_category as ItemCategory) || 'Selling',
        // Crafting item fields
        purchasedDate: item.purchased_date ? new Date(item.purchased_date) : undefined,
        // Selling item fields
        discountPercentage: item.discount_percentage || undefined,
        productTypes: (() => {
          try {
            return item.product_types ? (typeof item.product_types === 'string' ? JSON.parse(item.product_types) : item.product_types) : [];
          } catch {
            return [];
          }
        })() as ProductType[],
        // E-commerce fields
        isWebsiteItem: item.is_website_item || false,
        imageUrl: item.image_url || '',
        additionalImages: (() => {
          try {
            return item.additional_images ? JSON.parse(item.additional_images) : [];
          } catch {
            return [];
          }
        })(),
        specifications: item.specifications || '{}',
        weight: item.weight || 0,
        dimensions: (() => {
          try {
            return item.dimensions ? JSON.parse(item.dimensions) : { length: 0, width: 0, height: 0 };
          } catch {
            return { length: 0, width: 0, height: 0 };
          }
        })(),
        urlSlug: item.url_slug || '',
        metaDescription: item.meta_description || '',
        isFeatured: item.is_featured || false,
        salePrice: item.sale_price || null
      }));

      setItems(transformedItems);
      console.log('Inventory items loaded:', data?.length);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAdjustments = useCallback(async () => {
    try {
             // Skip relationship queries until database is fixed
       let data = null;
       try {
         const { data: fallbackData, error: fallbackError } = await supabase
           .from('inventory_adjustments')
           .select('*')
           .order('adjustment_date', { ascending: false });
         
         if (!fallbackError) {
           data = fallbackData?.map(adj => ({ ...adj, inventory_items: null })) || [];
           console.log('Inventory adjustments loaded without relationships');
         } else {
           console.warn('Error fetching inventory adjustments (table may not exist):', fallbackError);
         }
       } catch (fetchError) {
         console.warn('Inventory adjustments table may not exist:', fetchError);
         setAdjustments([]);
         return;
       }

      if (!data) {
        setAdjustments([]);
        return;
      }

      if (!data) {
        setAdjustments([]);
        return;
      }

      const formattedAdjustments: InventoryAdjustment[] = data.map(adjustment => ({
        id: adjustment.id,
        itemId: adjustment.item_id,
        previousQuantity: adjustment.previous_quantity,
        newQuantity: adjustment.new_quantity,
        reason: adjustment.reason as AdjustmentReason,
        notes: adjustment.notes || '',
        adjustmentDate: new Date(adjustment.adjustment_date),
        createdBy: adjustment.created_by || 'System',
        item: {
          id: adjustment.inventory_items?.id || '',
          name: adjustment.inventory_items?.name || 'Unknown Item',
          unitOfMeasure: (adjustment.inventory_items?.unit_of_measure as UnitOfMeasure) || 'pieces',
          description: '',
          category: '',
          purchaseCost: 0,
          sellingPrice: 0,
          currentStock: 0,
          reorderLevel: 0,
          sku: '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }));

      setAdjustments(formattedAdjustments);
    } catch (error) {
      console.error('Error fetching inventory adjustments:', error);
      // Don't show toast error for this as it's not critical for the main functionality
      setAdjustments([]);
    }
  }, []);

  const refreshInventoryData = useCallback(async () => {
    await Promise.all([
      fetchItems(),
      fetchAdjustments()
    ]);
  }, [fetchItems, fetchAdjustments]);

  useEffect(() => {
    refreshInventoryData();
  }, [refreshInventoryData]);

  const addItem = useCallback(async (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase.from('inventory_items').insert({
        name: itemData.name,
        description: itemData.description || '',
        category: itemData.category || '',
        unit_of_measure: itemData.unitOfMeasure,
        purchase_cost: itemData.purchaseCost,
        selling_price: itemData.sellingPrice,
        current_stock: itemData.currentStock,
        reorder_level: itemData.reorderLevel,
        sku: itemData.sku && itemData.sku.trim() !== '' ? itemData.sku.trim() : null,
        is_active: itemData.isActive,
        business_id: '550e8400-e29b-41d4-a716-446655440000',
        item_type: itemData.itemType || 'Materials',
        is_website_item: (itemData as any).isWebsiteItem || false,
        image_url: (itemData as any).imageUrl || null,
        additional_images: JSON.stringify((itemData as any).additionalImages || []),
        sale_price: (itemData as any).salePrice ? parseFloat((itemData as any).salePrice) : null,
        weight: (itemData as any).weight ? parseFloat((itemData as any).weight) : 0,
        dimensions: '{"length": 0, "width": 0, "height": 0}',
        url_slug: null,
        meta_description: null,
        is_featured: false,
        specifications: (itemData as any).specifications ? 
          JSON.stringify({ features: (itemData as any).specifications.split('\n').filter(Boolean) }) : 
          '{}'
      }).select().single();

      if (error) throw error;

      const newItem: InventoryItem = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        category: data.category || '',
        unitOfMeasure: data.unit_of_measure as UnitOfMeasure,
        purchaseCost: data.purchase_cost,
        sellingPrice: data.selling_price,
        currentStock: data.current_stock,
        reorderLevel: data.reorder_level,
        sku: data.sku || '',
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        // Item Type field
        itemType: (data.item_type as ItemType) || 'Materials',
        // E-commerce fields
        isWebsiteItem: data.is_website_item || false,
        imageUrl: data.image_url || '',
        additionalImages: (() => {
          try {
            return data.additional_images ? JSON.parse(data.additional_images) : [];
          } catch {
            return [];
          }
        })(),
        specifications: data.specifications || '{}',
        weight: data.weight || 0,
        dimensions: (() => {
          try {
            return data.dimensions ? JSON.parse(data.dimensions) : { length: 0, width: 0, height: 0 };
          } catch {
            return { length: 0, width: 0, height: 0 };
          }
        })(),
        urlSlug: data.url_slug || '',
        metaDescription: data.meta_description || '',
        isFeatured: data.is_featured || false,
        salePrice: data.sale_price || null
      };

      setItems((prevItems) => [...prevItems, newItem]);
      toast.success('Inventory item added successfully');
      return newItem;
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast.error('Failed to add inventory item');
      throw error;
    }
  }, []);

  const updateItem = useCallback(async (id: string, itemData: Partial<InventoryItem>) => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only update fields that are provided
      if (itemData.name !== undefined) updateData.name = itemData.name;
      if (itemData.description !== undefined) updateData.description = itemData.description || '';
      if (itemData.category !== undefined) updateData.category = itemData.category || '';
      if (itemData.unitOfMeasure !== undefined) updateData.unit_of_measure = itemData.unitOfMeasure;
      if (itemData.purchaseCost !== undefined) updateData.purchase_cost = itemData.purchaseCost;
      if (itemData.sellingPrice !== undefined) updateData.selling_price = itemData.sellingPrice;
      if (itemData.currentStock !== undefined) updateData.current_stock = itemData.currentStock;
      if (itemData.reorderLevel !== undefined) updateData.reorder_level = itemData.reorderLevel;
      if (itemData.sku !== undefined) updateData.sku = itemData.sku && itemData.sku.trim() !== '' ? itemData.sku.trim() : null;
      if (itemData.isActive !== undefined) updateData.is_active = itemData.isActive;
      if (itemData.itemType !== undefined) updateData.item_type = itemData.itemType;
      
      // Website-related fields
      if ((itemData as any).isWebsiteItem !== undefined) updateData.is_website_item = (itemData as any).isWebsiteItem || false;
      if ((itemData as any).imageUrl !== undefined) updateData.image_url = (itemData as any).imageUrl || null;
      if ((itemData as any).additionalImages !== undefined) updateData.additional_images = JSON.stringify((itemData as any).additionalImages || []);
      if ((itemData as any).salePrice !== undefined) updateData.sale_price = (itemData as any).salePrice ? parseFloat((itemData as any).salePrice) : null;
      if ((itemData as any).weight !== undefined) updateData.weight = (itemData as any).weight ? parseFloat((itemData as any).weight) : 0;
      if ((itemData as any).specifications !== undefined) {
        updateData.specifications = (itemData as any).specifications ? 
          JSON.stringify({ features: (itemData as any).specifications.split('\n').filter(Boolean) }) : 
          '{}';
      }

      const { data, error } = await supabase.from('inventory_items').update(updateData).eq('id', id).select().single();

      if (error) throw error;

      const updatedItem: InventoryItem = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        category: data.category || '',
        unitOfMeasure: data.unit_of_measure as UnitOfMeasure,
        purchaseCost: data.purchase_cost,
        sellingPrice: data.selling_price,
        currentStock: data.current_stock,
        reorderLevel: data.reorder_level,
        sku: data.sku || '',
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        // Item Type field
        itemType: (data.item_type as ItemType) || 'Materials',
        // E-commerce fields
        isWebsiteItem: data.is_website_item || false,
        imageUrl: data.image_url || '',
        additionalImages: (() => {
          try {
            return data.additional_images ? JSON.parse(data.additional_images) : [];
          } catch {
            return [];
          }
        })(),
        specifications: data.specifications || '{}',
        weight: data.weight || 0,
        dimensions: (() => {
          try {
            return data.dimensions ? JSON.parse(data.dimensions) : { length: 0, width: 0, height: 0 };
          } catch {
            return { length: 0, width: 0, height: 0 };
          }
        })(),
        urlSlug: data.url_slug || '',
        metaDescription: data.meta_description || '',
        isFeatured: data.is_featured || false,
        salePrice: data.sale_price || null
      };

      setItems(prevItems => 
        prevItems.map(item => item.id === id ? updatedItem : item)
      );

      toast.success('Inventory item updated successfully');
      return updatedItem;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast.error('Failed to update inventory item');
      throw error;
    }
  }, []);

  const updateItemStock = useCallback(async (id: string, newQuantity: number) => {
    try {
      const item = items.find((item) => item.id === id);
      if (!item) throw new Error('Item not found');

      const previousQuantity = item.currentStock;

      await updateItem(id, {
        currentStock: newQuantity
      });

      return {
        previousQuantity,
        newQuantity
      };
    } catch (error) {
      console.error('Error updating item stock:', error);
      toast.error('Failed to update item stock');
      throw error;
    }
  }, [items, updateItem]);

  const createInventoryAdjustment = useCallback(async (
    itemId: string, 
    previousQuantity: number, 
    newQuantity: number, 
    reason: AdjustmentReason, 
    notes?: string
  ) => {
    try {
      const item = items.find((item) => item.id === itemId);
      if (!item) throw new Error('Item not found');

      // Try to insert adjustment record, but don't fail if table doesn't exist
      let adjustmentId = '';
      try {
        const { data, error } = await supabase.from('inventory_adjustments').insert({
          item_id: itemId,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          reason,
          notes,
          created_by: 'User'
        }).select().single();

        if (error) {
          console.warn('Could not create adjustment record (table may not exist):', error);
        } else {
          adjustmentId = data?.id || '';
        }
      } catch (adjustmentError) {
        console.warn('Adjustment table not available:', adjustmentError);
      }

      // Always update the item stock regardless of adjustment record
      const quantityChange = newQuantity - previousQuantity;
      const transactionType = (() => {
        const reasonValue = String(reason);
        if (reasonValue === 'sale' || reasonValue === 'sales_order') return 'sales_order';
        if (reasonValue === 'purchase_order') return 'purchase_order';
        if (reasonValue === 'craft_completed') return 'craft_completed';
        if (reasonValue === 'manufacturing_used') return 'manufacturing_used';
        return 'adjustment';
      })();

      try {
        await supabase.rpc('record_inventory_transaction', {
          p_item_id: itemId,
          p_transaction_type: transactionType,
          p_quantity_change: quantityChange,
          p_variant_name: null,
          p_reference_id: adjustmentId || null,
          p_reference_type: 'adjustment',
          p_notes: notes || `Inventory adjustment (${reason})`,
          p_created_by: null
        });
      } catch (rpcError) {
        console.error('Error recording inventory transaction:', rpcError);
        await updateItem(itemId, {
          currentStock: newQuantity
        });
      }

      const newAdjustment: InventoryAdjustment = {
        id: adjustmentId || `temp-${Date.now()}`,
        itemId,
        previousQuantity,
        newQuantity,
        reason,
        notes: notes || '',
        adjustmentDate: new Date(),
        createdBy: 'User',
        item: {
          id: item.id,
          name: item.name,
          unitOfMeasure: item.unitOfMeasure,
          description: item.description,
          category: item.category,
          purchaseCost: item.purchaseCost,
          sellingPrice: item.sellingPrice,
          currentStock: newQuantity,
          reorderLevel: item.reorderLevel,
          sku: item.sku,
          isActive: item.isActive,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      };

      setAdjustments((prevAdjustments) => [newAdjustment, ...prevAdjustments]);
      setItems(prevItems => 
        prevItems.map(current => current.id === itemId ? { ...current, currentStock: newQuantity } : current)
      );
      toast.success('Inventory stock updated successfully');
      return newAdjustment;
    } catch (error) {
      console.error('Error creating inventory adjustment:', error);
      toast.error('Failed to update inventory stock');
      throw error;
    }
  }, [items, updateItem]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setItems(prevItems => prevItems.filter(item => item.id !== id));
      toast.success('Inventory item deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete inventory item');
      throw error;
    }
  }, []);

  const adjustStock = useCallback(async (
    itemId: string, 
    quantityChange: number, 
    reason: AdjustmentReason, 
    notes?: string
  ) => {
    try {
      const item = items.find((item) => item.id === itemId);
      if (!item) throw new Error('Item not found');

      const previousQuantity = item.currentStock;
      const newQuantity = previousQuantity + quantityChange;

      if (newQuantity < 0) {
        throw new Error('Adjustment would result in negative stock');
      }

      await createInventoryAdjustment(
        itemId,
        previousQuantity,
        newQuantity,
        reason,
        notes
      );

      return {
        previousQuantity,
        newQuantity
      };
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
      throw error;
    }
  }, [items, createInventoryAdjustment]);

  const increaseStock = useCallback(async (
    itemId: string,
    quantity: number,
    reason: AdjustmentReason = 'return',
    notes?: string
  ) => {
    return adjustStock(itemId, quantity, reason, notes);
  }, [adjustStock]);

  const getItemById = useCallback((id: string) => {
    return items.find((item) => item.id === id);
  }, [items]);

  // ============================
  // ITEM LINKING FUNCTIONS
  // ============================

  const fetchItemLinks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('item_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching item links (table may not exist):', error);
        return [];
      }

      const links: ItemLink[] = (data || []).map(link => ({
        id: link.id,
        parentItemId: link.parent_item_id,
        childItemId: link.child_item_id,
        quantityRequired: link.quantity_required || 1,
        notes: link.notes || '',
        createdAt: new Date(link.created_at),
        updatedAt: new Date(link.updated_at)
      }));

      setItemLinks(links);
      return links;
    } catch (error) {
      console.warn('Item links table may not exist:', error);
      return [];
    }
  }, []);

  const getLinkedItems = useCallback(async (itemId: string): Promise<LinkedItemInfo[]> => {
    try {
      // Get child items (where this item is the parent)
      const { data: childLinks, error: childError } = await supabase
        .from('item_links')
        .select(`
          id,
          child_item_id,
          quantity_required,
          notes,
          inventory_items!item_links_child_item_id_fkey(id, name, item_type, sku, current_stock)
        `)
        .eq('parent_item_id', itemId);

      if (childError) {
        console.warn('Error fetching child links:', childError);
      }

      // Get parent items (where this item is the child)
      const { data: parentLinks, error: parentError } = await supabase
        .from('item_links')
        .select(`
          id,
          parent_item_id,
          quantity_required,
          notes,
          inventory_items!item_links_parent_item_id_fkey(id, name, item_type, sku, current_stock)
        `)
        .eq('child_item_id', itemId);

      if (parentError) {
        console.warn('Error fetching parent links:', parentError);
      }

      const linkedItems: LinkedItemInfo[] = [];

      // Process child items
      if (childLinks) {
        childLinks.forEach((link: any) => {
          if (link.inventory_items) {
            linkedItems.push({
              linkId: link.id,
              linkedItemId: link.inventory_items.id,
              linkedItemName: link.inventory_items.name,
              linkedItemType: link.inventory_items.item_type || 'Materials',
              linkedItemSku: link.inventory_items.sku,
              quantityRequired: link.quantity_required || 1,
              linkType: 'child',
              notes: link.notes,
              currentStock: link.inventory_items.current_stock
            });
          }
        });
      }

      // Process parent items
      if (parentLinks) {
        parentLinks.forEach((link: any) => {
          if (link.inventory_items) {
            linkedItems.push({
              linkId: link.id,
              linkedItemId: link.inventory_items.id,
              linkedItemName: link.inventory_items.name,
              linkedItemType: link.inventory_items.item_type || 'Materials',
              linkedItemSku: link.inventory_items.sku,
              quantityRequired: link.quantity_required || 1,
              linkType: 'parent',
              notes: link.notes,
              currentStock: link.inventory_items.current_stock
            });
          }
        });
      }

      return linkedItems;
    } catch (error) {
      console.error('Error getting linked items:', error);
      return [];
    }
  }, []);

  const addItemLink = useCallback(async (
    parentItemId: string, 
    childItemId: string, 
    quantityRequired: number = 1, 
    notes?: string
  ): Promise<ItemLink | null> => {
    try {
      if (parentItemId === childItemId) {
        toast.error('Cannot link an item to itself');
        return null;
      }

      const { data, error } = await supabase
        .from('item_links')
        .insert({
          parent_item_id: parentItemId,
          child_item_id: childItemId,
          quantity_required: quantityRequired,
          notes: notes || null
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This link already exists');
        } else {
          console.error('Error adding item link:', error);
          toast.error('Failed to add item link');
        }
        return null;
      }

      const newLink: ItemLink = {
        id: data.id,
        parentItemId: data.parent_item_id,
        childItemId: data.child_item_id,
        quantityRequired: data.quantity_required || 1,
        notes: data.notes || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setItemLinks(prev => [...prev, newLink]);
      toast.success('Item linked successfully');
      return newLink;
    } catch (error) {
      console.error('Error adding item link:', error);
      toast.error('Failed to add item link');
      return null;
    }
  }, []);

  const updateItemLink = useCallback(async (
    linkId: string,
    quantityRequired?: number,
    notes?: string
  ): Promise<boolean> => {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (quantityRequired !== undefined) updateData.quantity_required = quantityRequired;
      if (notes !== undefined) updateData.notes = notes;

      const { error } = await supabase
        .from('item_links')
        .update(updateData)
        .eq('id', linkId);

      if (error) {
        console.error('Error updating item link:', error);
        toast.error('Failed to update item link');
        return false;
      }

      setItemLinks(prev => 
        prev.map(link => 
          link.id === linkId 
            ? { ...link, quantityRequired: quantityRequired ?? link.quantityRequired, notes: notes ?? link.notes }
            : link
        )
      );
      toast.success('Item link updated');
      return true;
    } catch (error) {
      console.error('Error updating item link:', error);
      toast.error('Failed to update item link');
      return false;
    }
  }, []);

  const removeItemLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('item_links')
        .delete()
        .eq('id', linkId);

      if (error) {
        console.error('Error removing item link:', error);
        toast.error('Failed to remove item link');
        return false;
      }

      setItemLinks(prev => prev.filter(link => link.id !== linkId));
      toast.success('Item link removed');
      return true;
    } catch (error) {
      console.error('Error removing item link:', error);
      toast.error('Failed to remove item link');
      return false;
    }
  }, []);

  const getMaterialsForProduct = useCallback((productId: string) => {
    return items.filter(item => {
      const links = itemLinks.filter(
        link => link.parentItemId === productId && item.id === link.childItemId
      );
      return links.length > 0 && item.itemType === 'Materials';
    });
  }, [items, itemLinks]);

  const getProductsUsingMaterial = useCallback((materialId: string) => {
    return items.filter(item => {
      const links = itemLinks.filter(
        link => link.childItemId === materialId && item.id === link.parentItemId
      );
      return links.length > 0 && item.itemType === 'Finished Products';
    });
  }, [items, itemLinks]);

  return {
    items,
    adjustments,
    itemLinks,
    isLoading,
    fetchItems,
    fetchAdjustments,
    fetchItemLinks,
    refreshInventoryData,
    addItem,
    updateItem,
    updateItemStock,
    createInventoryAdjustment,
    deleteItem,
    getItemById,
    adjustStock,
    increaseStock,
    // Item linking functions
    getLinkedItems,
    addItemLink,
    updateItemLink,
    removeItemLink,
    getMaterialsForProduct,
    getProductsUsingMaterial
  };
}
