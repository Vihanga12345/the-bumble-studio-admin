import { useState, useEffect } from 'react';
import { PurchaseOrder, PurchaseOrderStatus, Supplier, PurchaseItem, PurchaseOrderHideLink } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useSuppliers } from './useSuppliers';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { suppliers } = useSuppliers();
  const { currentUser } = useERPAuth();

  const recordPurchaseTransaction = async (params: {
    itemId: string;
    quantityChange: number;
    variantItemId?: string | null;
    variantName?: string | null;
    referenceId: string;
    referenceType: string;
    notes: string;
  }) => {
    const attemptWithVariantId = await supabase.rpc('record_inventory_transaction', {
      p_item_id: params.itemId,
      p_transaction_type: 'purchase_order',
      p_quantity_change: params.quantityChange,
      p_variant_item_id: params.variantItemId || null,
      p_reference_id: params.referenceId,
      p_reference_type: params.referenceType,
      p_notes: params.notes,
      p_created_by: null
    });

    if (!attemptWithVariantId.error) return;

    const attemptWithVariantName = await supabase.rpc('record_inventory_transaction', {
      p_item_id: params.itemId,
      p_transaction_type: 'purchase_order',
      p_quantity_change: params.quantityChange,
      p_variant_name: params.variantName || null,
      p_reference_id: params.referenceId,
      p_reference_type: params.referenceType,
      p_notes: params.notes,
      p_created_by: null
    } as any);

    if (attemptWithVariantName.error) {
      console.error('Error recording inventory transaction:', attemptWithVariantName.error);
      throw attemptWithVariantName.error;
    }
  };

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching purchase orders:', ordersError);
        throw ordersError;
      }

      console.log('Raw orders data from database:', ordersData);

      // Fetch purchase order items (without relationship join)
      let itemsData: any[] = [];
      try {
        const { data: itemsRaw, error: itemsError } = await supabase
          .from('purchase_order_items')
          .select('*');
        
        if (!itemsError) {
          itemsData = itemsRaw || [];
          console.log('Purchase order items loaded successfully');
        } else {
          console.error('Error fetching purchase order items:', itemsError);
        }
      } catch (fetchError) {
        console.error('Error in items fetch:', fetchError);
      }

      const { data: hideLinksData } = await (supabase as any)
        .from('purchase_order_hides')
        .select('purchase_order_id, hide_id, quantity, unit_price, notes');

      let poImagesMap: Record<string, string[]> = {};
      try {
        const { data: poImagesData } = await (supabase as any).from('purchase_order_images').select('purchase_order_id, image_url, sort_order').order('sort_order', { ascending: true });
        (poImagesData || []).forEach((r: any) => {
          if (!poImagesMap[r.purchase_order_id]) poImagesMap[r.purchase_order_id] = [];
          poImagesMap[r.purchase_order_id].push(r.image_url);
        });
      } catch (_) {}

      // Load inventory items for item_id mapping (include image_url)
      const itemIds = Array.from(new Set(itemsData.map(item => item.item_id).filter(Boolean)));
      let inventoryMap: Record<string, any> = {};
      let inventoryNameMap: Record<string, any> = {};
      if (itemIds.length > 0) {
        const { data: inventoryItems } = await supabase
          .from('inventory_items')
          .select('id, name, sku, unit_of_measure, image_url')
          .in('id', itemIds);
        (inventoryItems || []).forEach(item => {
          inventoryMap[item.id] = item;
          inventoryNameMap[item.name] = item;
        });
      }
      if (Object.keys(inventoryNameMap).length === 0) {
        const { data: inventoryItems } = await supabase
          .from('inventory_items')
          .select('id, name, sku, unit_of_measure');
        (inventoryItems || []).forEach(item => {
          inventoryNameMap[item.name] = item;
        });
      }

      console.log('Raw items data from database:', itemsData);

      const formattedOrders: PurchaseOrder[] = ordersData.map(order => {
        const orderItems = (itemsData || [])
          .filter(item => item.purchase_order_id === order.id)
          .map(item => ({
            id: item.id,
            name: inventoryMap[item.item_id]?.name || inventoryNameMap[item.name]?.name || item.name || 'Unknown Item',
            quantity: item.quantity,
            unitCost: item.unit_cost,
            totalCost: item.total_cost,
            receivedQuantity: item.received_quantity || 0,
            itemId: item.item_id || inventoryNameMap[item.name]?.id,
            imageUrl: inventoryMap[item.item_id]?.image_url || inventoryNameMap[item.name]?.image_url
          }));

        const hideLinks: PurchaseOrderHideLink[] = (hideLinksData || [])
          .filter((link: any) => link.purchase_order_id === order.id)
          .map((link: any) => ({
            hideId: link.hide_id,
            quantity: Number(link.quantity || 0),
            unitPrice: Number(link.unit_price || 0),
            notes: link.notes || ''
          }));

        // Handle case where supplier might be null
        const supplier: Supplier = order.supplier ? {
          id: order.supplier.id,
          name: order.supplier.name,
          telephone: order.supplier.telephone || '',
          address: order.supplier.address || '',
          paymentTerms: order.supplier.payment_terms || '',
          createdAt: new Date(order.supplier.created_at)
        } : {
          id: order.supplier_id,
          name: 'Unknown Supplier',
          telephone: '',
          address: '',
          paymentTerms: '',
          createdAt: new Date()
        };

        return {
          id: order.id,
          orderNumber: order.order_number,
          supplier,
          items: orderItems,
          linkedHides: hideLinks,
          totalAmount: order.total_amount,
          status: order.status as PurchaseOrderStatus,
          createdAt: new Date(order.created_at),
          updatedAt: new Date(order.updated_at),
          expectedDeliveryDate: order.expected_delivery_date ? new Date(order.expected_delivery_date) : undefined,
          notes: order.notes || '',
          poImages: poImagesMap[order.id] || []
        };
      });

      setPurchaseOrders(formattedOrders);
      console.log('Purchase orders loaded from database:', formattedOrders);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const addPurchaseOrder = async (
    supplierId: string,
    items: PurchaseItem[],
    notes?: string,
    linkedHides: PurchaseOrderHideLink[] = [],
    poImageUrls: string[] = []
  ) => {
    setIsLoading(true);
    
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      
      const itemsTotal = items.reduce((sum, item) => sum + item.totalCost, 0);
      const hidesTotal = linkedHides.reduce((sum, link) => sum + (link.quantity * (link.unitPrice || 0)), 0);
      const totalAmount = itemsTotal + hidesTotal;
      const orderNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      
      // Get business_id from current user, default to a proper UUID if not available
      const businessId = currentUser?.business_id || '550e8400-e29b-41d4-a716-446655440000';
      
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          order_number: orderNumber,
          supplier_id: supplierId,
          total_amount: totalAmount,
          status: 'draft',
          business_id: businessId,
          notes
        })
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      // First, let's check the table structure to see if item_id column exists
      const { data: tableInfo, error: tableError } = await supabase
        .from('purchase_order_items')
        .select()
        .limit(1);

      const orderItems = await Promise.all(
        items.map(async item => {
          // Use inventoryItemId if available, otherwise try to find by name
          let inventoryItemId = (item as any).inventoryItemId;
          
          if (!inventoryItemId) {
            const { data: inventoryItems } = await supabase
              .from('inventory_items')
              .select('id, name')
              .eq('name', item.name);
            inventoryItemId = inventoryItems?.[0]?.id;
          }

          try {
            // Insert with item_id and optional variant_item_id
            if (inventoryItemId) {
              const { data: itemData, error: itemError } = await supabase
                .from('purchase_order_items')
                .insert({
                  purchase_order_id: orderData.id,
                  item_id: inventoryItemId,
                  variant_item_id: (item as any).variantId || null,
                  quantity: item.quantity,
                  unit_cost: item.unitCost,
                  total_cost: item.totalCost
                })
                .select()
                .single();

              if (!itemError) {
                return {
                  id: itemData.id,
                  name: item.name,
                  quantity: itemData.quantity,
                  unitCost: itemData.unit_cost,
                  totalCost: itemData.total_cost,
                  receivedQuantity: itemData.received_quantity || 0
                };
              }
            }

            // If item_id insert fails, fall back to name-based insert (old schema)
            const { data: itemData, error: itemError } = await supabase
              .from('purchase_order_items')
              .insert({
                purchase_order_id: orderData.id,
                name: item.name,
                quantity: item.quantity,
                unit_cost: item.unitCost,
                total_cost: item.totalCost
              })
              .select()
              .single();

            if (itemError) {
              throw itemError;
            }

            return {
              id: itemData.id,
              name: item.name,
              quantity: itemData.quantity,
              unitCost: itemData.unit_cost,
              totalCost: itemData.total_cost,
              receivedQuantity: itemData.received_quantity || 0
            };

          } catch (insertError) {
            console.error('Error inserting purchase order item:', insertError);
            throw insertError;
          }
        })
      );

      if (poImageUrls.length > 0) {
        await (supabase as any).from('purchase_order_images').insert(
          poImageUrls.map((url, i) => ({
            purchase_order_id: orderData.id,
            image_url: url,
            sort_order: i
          }))
        );
      }

      if (linkedHides.length > 0) {
        const { error: hideLinkError } = await (supabase as any).from('purchase_order_hides').insert(
          linkedHides.map((link) => ({
            purchase_order_id: orderData.id,
            hide_id: link.hideId,
            quantity: link.quantity,
            unit_price: link.unitPrice,
            notes: link.notes || null
          }))
        );
        if (hideLinkError) {
          throw hideLinkError;
        }
      }

      // Record inventory transactions for purchase order
      for (const item of items) {
        let inventoryItemId = (item as any).inventoryItemId;
        if (!inventoryItemId) {
          const { data: inventoryItems } = await supabase
            .from('inventory_items')
            .select('id, name')
            .eq('name', item.name);
          inventoryItemId = inventoryItems?.[0]?.id;
        }

        if (inventoryItemId) {
          await recordPurchaseTransaction({
            itemId: inventoryItemId,
            quantityChange: item.quantity,
            variantItemId: (item as any).variantId || null,
            variantName: (item as any).variantName || null,
            referenceId: orderData.id,
            referenceType: 'purchase_order',
            notes: `Purchase order received: ${orderNumber}`
          });
        }
      }

      // Record financial transaction for purchase only when amount > 0
      if (totalAmount > 0) {
        const { data: existingTransaction } = await supabase
          .from('financial_transactions')
          .select('id')
          .eq('reference_number', orderNumber)
          .eq('category', 'purchases')
          .eq('type', 'expense')
          .limit(1)
          .maybeSingle();

        const financialPayload: Record<string, unknown> = {
          amount: totalAmount,
          category: 'purchases',
          type: 'expense',
          date: new Date().toISOString(),
          description: `Purchase Order ${orderNumber}`,
          payment_method: 'manual',
          reference_number: orderNumber,
          business_id: businessId
        };
        if (poImageUrls.length > 0) {
          financialPayload.bill_images = poImageUrls;
        }

        if (existingTransaction?.id) {
          await supabase
            .from('financial_transactions')
            .update(financialPayload)
            .eq('id', existingTransaction.id);
        } else {
          await supabase.from('financial_transactions').insert(financialPayload);
        }
      }

      const newPO: PurchaseOrder = {
        id: orderData.id,
        orderNumber: orderData.order_number,
        supplier,
        items: orderItems,
        linkedHides,
        totalAmount: orderData.total_amount,
        status: orderData.status as PurchaseOrderStatus,
        createdAt: new Date(orderData.created_at),
        updatedAt: new Date(orderData.updated_at),
        notes: orderData.notes || ''
      };
      
      console.log('Creating new purchase order:', newPO);
      setPurchaseOrders(prevPOs => [newPO, ...prevPOs]);
      toast.success('Purchase order created successfully');
      setIsLoading(false);
      return newPO;
    } catch (error) {
      console.error('Error adding purchase order:', error);
      toast.error(`Failed to create purchase order: ${(error as Error).message}`);
      setIsLoading(false);
      throw error;
    }
  };

  const updatePurchaseOrderStatus = async (id: string, status: PurchaseOrderStatus) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', id);

      if (error) {
        throw error;
      }

      if (status === 'cancelled') {
        const { data: poData } = await supabase.from('purchase_orders').select('order_number').eq('id', id).single();
        const orderNumber = poData?.order_number;
        if (orderNumber) {
          await supabase
            .from('financial_transactions')
            .delete()
            .eq('reference_number', orderNumber)
            .eq('category', 'purchases');
        }

        const { data: itemsData, error: itemsError } = await supabase
          .from('purchase_order_items')
          .select('*')
          .eq('purchase_order_id', id);

        if (!itemsError && itemsData) {
          for (const item of itemsData) {
            if (item.item_id) {
              await recordPurchaseTransaction({
                itemId: item.item_id,
                quantityChange: -item.quantity,
                variantItemId: item.variant_item_id || null,
                variantName: null,
                referenceId: id,
                referenceType: 'purchase_order_cancelled',
                notes: 'Purchase order cancelled'
              });
            }
          }
        }

        await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', id);

        await supabase
          .from('purchase_orders')
          .delete()
          .eq('id', id);

        setPurchaseOrders(prevPOs => prevPOs.filter(po => po.id !== id));
        toast.success('Purchase order cancelled and removed');
        setIsLoading(false);
        return;
      }

      setPurchaseOrders(prevPOs => 
        prevPOs.map(po => 
          po.id === id ? { ...po, status, updatedAt: new Date() } : po
        )
      );
      console.log('Updated purchase order status for ID:', id, 'New status:', status);
      toast.success(`Purchase order status updated to ${status}`);
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      toast.error(`Failed to update status: ${(error as Error).message}`);
      setIsLoading(false);
      throw error;
    }
  };

  const updatePurchaseOrder = async (
    id: string,
    supplierId: string,
    items: PurchaseItem[],
    notes?: string,
    linkedHides: PurchaseOrderHideLink[] = [],
    poImageUrls: string[] = []
  ) => {
    setIsLoading(true);
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const itemsTotal = items.reduce((sum, item) => sum + item.totalCost, 0);
      const hidesTotal = linkedHides.reduce((sum, link) => sum + (link.quantity * (link.unitPrice || 0)), 0);
      const totalAmount = itemsTotal + hidesTotal;

      const { data: existingItems, error: existingItemsError } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', id);

      if (existingItemsError) {
        throw existingItemsError;
      }

      const existingMap = new Map<string, { quantity: number; variantItemId?: string | null }>();
      (existingItems || []).forEach(item => {
        if (item.item_id) {
          existingMap.set(item.item_id, {
            quantity: item.quantity,
            variantItemId: item.variant_item_id || null
          });
        }
      });

      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({
          supplier_id: supplierId,
          total_amount: totalAmount,
          notes
        })
        .eq('id', id);

      if (orderError) {
        throw orderError;
      }

      const { error: deleteError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', id);

      if (deleteError) {
        throw deleteError;
      }

      const { error: deleteHideLinksError } = await (supabase as any)
        .from('purchase_order_hides')
        .delete()
        .eq('purchase_order_id', id);
      if (deleteHideLinksError) {
        throw deleteHideLinksError;
      }

      await (supabase as any).from('purchase_order_images').delete().eq('purchase_order_id', id);
      if (poImageUrls.length > 0) {
        await (supabase as any).from('purchase_order_images').insert(
          poImageUrls.map((url, i) => ({
            purchase_order_id: id,
            image_url: url,
            sort_order: i
          }))
        );
      }

      const orderNumber = purchaseOrders.find(po => po.id === id)?.orderNumber;
      if (orderNumber) {
        const { data: existingTx } = await supabase.from('financial_transactions').select('id').eq('reference_number', orderNumber).eq('category', 'purchases').maybeSingle();
        if (existingTx?.id && poImageUrls.length > 0) {
          await supabase.from('financial_transactions').update({ bill_images: poImageUrls }).eq('id', existingTx.id);
        }
      }

      const orderItems = await Promise.all(
        items.map(async item => {
          let inventoryItemId = (item as any).inventoryItemId;
          if (!inventoryItemId) {
            const { data: inventoryItems } = await supabase
              .from('inventory_items')
              .select('id, name')
              .eq('name', item.name);
            inventoryItemId = inventoryItems?.[0]?.id;
          }

          if (inventoryItemId) {
            const { error: itemError } = await supabase
              .from('purchase_order_items')
              .insert({
                purchase_order_id: id,
                item_id: inventoryItemId,
                variant_item_id: (item as any).variantId || null,
                quantity: item.quantity,
                unit_cost: item.unitCost,
                total_cost: item.totalCost
              });

            if (itemError) {
              const { error: fallbackError } = await supabase
                .from('purchase_order_items')
                .insert({
                  purchase_order_id: id,
                  name: item.name,
                  quantity: item.quantity,
                  unit_cost: item.unitCost,
                  total_cost: item.totalCost
                });

              if (fallbackError) {
                throw fallbackError;
              }
            }

            return {
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              receivedQuantity: item.receivedQuantity || 0,
              itemId: inventoryItemId
            };
          }

          const { error: itemError } = await supabase
            .from('purchase_order_items')
            .insert({
              purchase_order_id: id,
              name: item.name,
              quantity: item.quantity,
              unit_cost: item.unitCost,
              total_cost: item.totalCost
            });

          if (itemError) {
            throw itemError;
          }

          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            receivedQuantity: item.receivedQuantity || 0
          };
        })
      );

      if (linkedHides.length > 0) {
        const { error: insertHideLinksError } = await (supabase as any).from('purchase_order_hides').insert(
          linkedHides.map((link) => ({
            purchase_order_id: id,
            hide_id: link.hideId,
            quantity: link.quantity,
            unit_price: link.unitPrice,
            notes: link.notes || null
          }))
        );
        if (insertHideLinksError) {
          throw insertHideLinksError;
        }
      }

      const newMap = new Map<string, { quantity: number; variantItemId?: string | null }>();
      items.forEach(item => {
        const inventoryItemId = (item as any).inventoryItemId;
        if (inventoryItemId) {
          newMap.set(inventoryItemId, {
            quantity: item.quantity,
            variantItemId: (item as any).variantId || null
          });
        }
      });

      const affectedItemIds = new Set([...existingMap.keys(), ...newMap.keys()]);
      for (const itemId of affectedItemIds) {
        const previous = existingMap.get(itemId)?.quantity || 0;
        const next = newMap.get(itemId)?.quantity || 0;
        const diff = next - previous;
        if (diff !== 0) {
          await recordPurchaseTransaction({
            itemId,
            quantityChange: diff,
            variantItemId: newMap.get(itemId)?.variantItemId || existingMap.get(itemId)?.variantItemId || null,
            variantName: null,
            referenceId: id,
            referenceType: 'purchase_order_edit',
            notes: 'Purchase order updated'
          });
        }
      }

      const updatedPO: PurchaseOrder = {
        id,
        orderNumber: purchaseOrders.find(po => po.id === id)?.orderNumber || '',
        supplier,
        items: orderItems,
        linkedHides,
        totalAmount,
        status: purchaseOrders.find(po => po.id === id)?.status || 'draft',
        createdAt: purchaseOrders.find(po => po.id === id)?.createdAt || new Date(),
        updatedAt: new Date(),
        notes: notes || ''
      };

      setPurchaseOrders(prev => prev.map(po => (po.id === id ? updatedPO : po)));

      if (updatedPO.orderNumber && totalAmount > 0) {
        const { data: existingTransaction } = await supabase
          .from('financial_transactions')
          .select('id')
          .eq('reference_number', updatedPO.orderNumber)
          .eq('category', 'purchases')
          .eq('type', 'expense')
          .limit(1)
          .maybeSingle();

        const payload = {
          amount: totalAmount,
          category: 'purchases',
          type: 'expense',
          date: new Date().toISOString(),
          description: `Purchase Order ${updatedPO.orderNumber}`,
          payment_method: 'manual',
          reference_number: updatedPO.orderNumber,
          business_id: currentUser?.business_id || '550e8400-e29b-41d4-a716-446655440000'
        };

        if (existingTransaction?.id) {
          await supabase
            .from('financial_transactions')
            .update(payload)
            .eq('id', existingTransaction.id);
        } else {
          await supabase.from('financial_transactions').insert(payload);
        }
      }
      toast.success('Purchase order updated successfully');
      setIsLoading(false);
      return updatedPO;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      toast.error(`Failed to update purchase order: ${(error as Error).message}`);
      setIsLoading(false);
      throw error;
    }
  };

  const deletePurchaseOrder = async (id: string) => {
    setIsLoading(true);
    
    try {
      // Get order details before deleting
      const order = getPurchaseOrderById(id);
      
      // Delete associated financial transaction if exists
      if (order?.orderNumber) {
        await supabase
          .from('financial_transactions')
          .delete()
          .eq('reference_number', order.orderNumber)
          .eq('category', 'purchases');
      }

      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setPurchaseOrders(prevPOs => prevPOs.filter(po => po.id !== id));
      console.log('Deleted purchase order with ID:', id);
      toast.success('Purchase order deleted successfully');
      setIsLoading(false);
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      toast.error(`Failed to delete purchase order: ${(error as Error).message}`);
      setIsLoading(false);
      throw error;
    }
  };

  const getPurchaseOrderById = (id: string): PurchaseOrder | undefined => {
    return purchaseOrders.find(po => po.id === id);
  };

  // Alias methods to match what's used in PurchaseOrderDetail
  const getOrderById = getPurchaseOrderById;
  const updateOrderStatus = updatePurchaseOrderStatus;

  // Add PDF export functionality
  const exportOrderToPdf = async (id: string) => {
    try {
      const order = getPurchaseOrderById(id);
      if (!order) {
        throw new Error('Purchase order not found');
      }
      
      // Use the new PDF generator
      const { generatePurchaseOrderPDF } = await import('@/lib/pdfGenerator');
      await generatePurchaseOrderPDF(order);
      
      toast.success('Purchase order exported to PDF successfully');
      return true;
    } catch (error) {
      console.error('Error exporting purchase order to PDF:', error);
      toast.error(`Failed to export purchase order: ${(error as Error).message}`);
      throw error;
    }
  };

  // Add Excel export functionality for all purchase orders
  const exportOrdersToExcel = () => {
    try {
      // Prepare data for Excel export
      const exportData = purchaseOrders.map(order => ({
        'Order Number': order.orderNumber,
        'Supplier': order.supplier.name,
        'Total Amount': `Rs ${order.totalAmount.toFixed(2)}`,
        'Status': order.status,
        'Date Created': new Date(order.createdAt).toLocaleDateString(),
        'Date Updated': new Date(order.updatedAt).toLocaleDateString(),
        'Items Count': order.items.length
      }));
      
      // Create workbook and add worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');
      
      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, 'purchase_orders.xlsx');
      
      toast.success('Purchase orders exported to Excel successfully');
      return true;
    } catch (error) {
      console.error('Error exporting purchase orders to Excel:', error);
      toast.error(`Failed to export purchase orders: ${(error as Error).message}`);
      throw error;
    }
  };

  return {
    purchaseOrders,
    isLoading,
    addPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    deletePurchaseOrder,
    getPurchaseOrderById,
    // Add aliases and new methods
    getOrderById,
    updateOrderStatus,
    exportOrderToPdf,
    exportOrdersToExcel,
    refreshPurchaseOrders: fetchPurchaseOrders
  };
};
