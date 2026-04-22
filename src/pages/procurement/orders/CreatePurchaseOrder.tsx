
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, ArrowLeft, FileText, Package, ImageIcon } from 'lucide-react';
import { PurchaseItem, PurchaseOrderHideLink } from '@/types';
import { toast } from 'sonner';
import { useSuppliers } from '@/hooks/useSuppliers';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useInventory } from '@/hooks/useInventory';
import { useHides } from '@/hooks/useHides';
import { supabase } from '@/integrations/supabase/client';
import { uploadMultipleImages, deleteImage } from '@/lib/uploadUtils';

type ItemTypeOption = 'hides' | 'crafting';

interface PurchaseItemWithImage extends PurchaseItem {
  imageUrl?: string;
  variantId?: string;
  variantName?: string;
  inventoryItemId?: string;
  itemType?: ItemTypeOption;
  hideId?: string;
}

const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { suppliers } = useSuppliers();
  const { addPurchaseOrder, updatePurchaseOrder, getPurchaseOrderById } = usePurchaseOrders();
  const { items: inventoryItems } = useInventory();
  const { hides } = useHides();
  const hasLoadedOrder = useRef(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<PurchaseItemWithImage[]>([
    {
      id: '1',
      name: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      imageUrl: '',
      itemType: 'crafting'
    }
  ]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, any[]>>({});
  const [poImages, setPoImages] = useState<string[]>([]);
  const [poImageFiles, setPoImageFiles] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const poImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('Current suppliers in form:', suppliers);
    console.log('Available inventory items:', inventoryItems);
  }, [suppliers, inventoryItems]);

  useEffect(() => {
    const loadExistingOrder = async () => {
      if (!isEditMode || !id || hasLoadedOrder.current) return;
      const existingOrder = getPurchaseOrderById(id);

      if (existingOrder) {
        hasLoadedOrder.current = true;
        setSelectedSupplier(existingOrder.supplier.id);
        setNotes(existingOrder.notes || '');
        const mappedItems = existingOrder.items.map(item => {
          const inventoryMatch = inventoryItems.find(inv => inv.id === item.itemId)
            || inventoryItems.find(inv => inv.name === item.name);
          return ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          imageUrl: inventoryMatch?.imageUrl || '',
          inventoryItemId: item.itemId || inventoryMatch?.id,
          variantId: (item as any).variantId,
          variantName: (item as any).variantName
        });
        });
        const hideRows: PurchaseItemWithImage[] = (existingOrder.linkedHides || []).map((link, index) => {
          const hide = hides.find(h => h.id === link.hideId);
          return {
            id: `hide-${index}`,
            name: hide?.hideName || 'Unknown Hide',
            quantity: link.quantity,
            unitCost: link.unitPrice || 0,
            totalCost: (link.quantity || 1) * (link.unitPrice || 0),
            imageUrl: hide?.imageUrls?.[0] || '',
            itemType: 'hides' as ItemTypeOption,
            hideId: link.hideId
          };
        });
        const craftingRows = mappedItems.map(m => ({ ...m, itemType: 'crafting' as ItemTypeOption }));
        setItems([...craftingRows, ...hideRows]);
        mappedItems.forEach(item => {
          if (item.inventoryItemId) {
            loadVariants(item.inventoryItemId);
          }
        });
        const { data: poImagesData } = await (supabase as any).from('purchase_order_images').select('image_url').eq('purchase_order_id', existingOrder.id).order('sort_order', { ascending: true });
        setPoImages((poImagesData || []).map((r: any) => r.image_url));
        return;
      }

      try {
        const { data: orderData, error: orderError } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('id', id)
          .single();

        if (orderError || !orderData) {
          console.error('Error loading purchase order:', orderError);
          return;
        }

        const { data: itemsData, error: itemsError } = await supabase
          .from('purchase_order_items')
          .select('*')
          .eq('purchase_order_id', id);

        if (itemsError) {
          console.error('Error loading purchase order items:', itemsError);
        }

        hasLoadedOrder.current = true;
        setSelectedSupplier(orderData.supplier_id);
        setNotes(orderData.notes || '');

        const mappedItems = (itemsData || []).map(item => {
          const inventoryItem = inventoryItems.find(inv => inv.id === item.item_id)
            || inventoryItems.find(inv => inv.name === item.name);
          return {
            id: item.id,
            name: inventoryItem?.name || item.name || 'Unknown Item',
            quantity: item.quantity,
            unitCost: item.unit_cost,
            totalCost: item.total_cost,
            imageUrl: inventoryItem?.imageUrl || '',
            inventoryItemId: item.item_id || inventoryItem?.id,
            variantId: item.variant_item_id || undefined,
            variantName: inventoryItem?.variantName || undefined
          };
        });

        const { data: hideLinkRows } = await (supabase as any)
          .from('purchase_order_hides')
          .select('*')
          .eq('purchase_order_id', id);
        const hideRowsFromDb: PurchaseItemWithImage[] = (hideLinkRows || []).map((row: any, index: number) => {
          const hide = hides.find(h => h.id === row.hide_id);
          return {
            id: row.id || `db-hide-${index}`,
            name: hide?.hideName || 'Unknown Hide',
            quantity: Number(row.quantity || 1),
            unitCost: Number(row.unit_price || 0),
            totalCost: Number(row.quantity || 1) * Number(row.unit_price || 0),
            imageUrl: hide?.imageUrls?.[0] || '',
            itemType: 'hides' as ItemTypeOption,
            hideId: row.hide_id
          };
        });
        const craftingRows = mappedItems.map(m => ({ ...m, itemType: 'crafting' as ItemTypeOption }));
        const allRows = [...craftingRows, ...hideRowsFromDb];
        setItems(allRows.length > 0 ? allRows : [{ id: '1', name: '', quantity: 1, unitCost: 0, totalCost: 0, imageUrl: '', itemType: 'crafting' }]);
        craftingRows.forEach(item => {
          if (item.inventoryItemId) {
            loadVariants(item.inventoryItemId);
          }
        });

        const { data: poImagesData } = await (supabase as any).from('purchase_order_images').select('image_url').eq('purchase_order_id', id).order('sort_order', { ascending: true });
        setPoImages((poImagesData || []).map((r: any) => r.image_url));
      } catch (error) {
        console.error('Error loading purchase order for edit:', error);
      }
    };

    loadExistingOrder();
  }, [id, isEditMode, getPurchaseOrderById, inventoryItems, hides]);

  const loadVariants = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('parent_item_id', parentId)
        .eq('is_variant', true);
      
      if (error) throw error;
      
      setVariantsByProduct(prev => ({
        ...prev,
        [parentId]: data || []
      }));
    } catch (error) {
      console.error('Error loading variants:', error);
    }
  };

  const supplierMatchedHides = hides.filter((hide) => !selectedSupplier || hide.supplierId === selectedSupplier);
  const craftingItems = inventoryItems.filter((item) => item.itemCategory === 'Crafting' && item.isActive);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        name: '',
        quantity: 1,
        unitCost: 0,
        totalCost: 0,
        imageUrl: '',
        itemType: 'crafting'
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    } else {
      toast.error('You must have at least one item in the purchase order');
    }
  };

  const handleItemChange = (id: string, field: keyof PurchaseItemWithImage, value: string | number) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          if (field === 'itemType') {
            updatedItem.inventoryItemId = undefined;
            updatedItem.hideId = undefined;
            updatedItem.name = '';
            updatedItem.unitCost = 0;
            updatedItem.totalCost = 0;
            updatedItem.imageUrl = '';
            updatedItem.variantId = undefined;
            updatedItem.variantName = undefined;
          }
          
          if (field === 'quantity' || field === 'unitCost') {
            const quantity = field === 'quantity' ? Number(value) : item.quantity;
            const unitCost = field === 'unitCost' ? Number(value) : item.unitCost;
            updatedItem.totalCost = quantity * unitCost;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleItemSelection = (id: string, selectedId: string) => {
    const row = items.find(i => i.id === id);
    if (!row) return;
    const itemType = row.itemType || 'crafting';

    if (itemType === 'hides') {
      const selectedHide = supplierMatchedHides.find(h => h.id === selectedId);
      if (selectedHide) {
        setItems(items.map(item => {
          if (item.id === id) {
            return {
              ...item,
              hideId: selectedHide.id,
              name: selectedHide.hideName,
              unitCost: selectedHide.price,
              totalCost: selectedHide.price * item.quantity,
              imageUrl: selectedHide.imageUrls?.[0] || '',
              inventoryItemId: undefined,
              variantId: undefined,
              variantName: undefined
            };
          }
          return item;
        }));
      }
    } else {
      const selectedItem = craftingItems.find(c => c.id === selectedId);
      if (selectedItem) {
        setItems(items.map(item => {
          if (item.id === id) {
            loadVariants(selectedId);
            return {
              ...item,
              inventoryItemId: selectedId,
              hideId: undefined,
              name: selectedItem.name,
              unitCost: selectedItem.purchaseCost,
              totalCost: selectedItem.purchaseCost * item.quantity,
              imageUrl: selectedItem.imageUrl || '',
              variantId: undefined,
              variantName: undefined
            };
          }
          return item;
        }));
      }
    }
  };

  const handleVariantSelection = (id: string, variantId: string, itemId: string) => {
    const variants = variantsByProduct[itemId] || [];
    const selectedVariant = variants.find(v => v.id === variantId);
    
    if (selectedVariant) {
      setItems(
        items.map(item => {
          if (item.id === id) {
            return {
              ...item,
              variantId,
              variantName: selectedVariant.variant_name,
              unitCost: selectedVariant.purchase_cost || selectedVariant.purchaseCost,
              totalCost: (selectedVariant.purchase_cost || selectedVariant.purchaseCost) * item.quantity
            };
          }
          return item;
        })
      );
    }
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.totalCost, 0);
  };

  const handleCreateOrder = async () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }

    const invalidItems = items.filter(item => !item.name || item.quantity <= 0 || item.unitCost <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please fill in all item details with valid quantities and costs');
      return;
    }

    const craftingItemsForSave = items
      .filter((i): i is PurchaseItemWithImage & { inventoryItemId: string } => (i.itemType || 'crafting') === 'crafting' && !!i.inventoryItemId)
      .map(i => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unitCost: i.unitCost,
        totalCost: i.totalCost,
        inventoryItemId: i.inventoryItemId,
        variantId: i.variantId,
        variantName: i.variantName
      }));
    const linkedHidesForSave: PurchaseOrderHideLink[] = items
      .filter((i): i is PurchaseItemWithImage & { hideId: string } => i.itemType === 'hides' && !!i.hideId)
      .map(i => ({
        hideId: i.hideId,
        quantity: i.quantity,
        unitPrice: i.unitCost,
        notes: ''
      }));

    let allPoImageUrls = [...poImages];
    if (poImageFiles.length > 0) {
      setIsUploadingImages(true);
      try {
        const uploaded = await uploadMultipleImages(poImageFiles, 'purchase-orders');
        allPoImageUrls = [...poImages, ...uploaded].slice(0, 5);
      } catch (e) {
        toast.error('Failed to upload images');
        setIsUploadingImages(false);
        return;
      }
      setIsUploadingImages(false);
    }

    try {
      if (isEditMode && id) {
        await updatePurchaseOrder(
          id,
          selectedSupplier,
          craftingItemsForSave,
          notes,
          linkedHidesForSave,
          allPoImageUrls
        );
        toast.success('Purchase Order updated successfully');
      } else {
        await addPurchaseOrder(
          selectedSupplier,
          craftingItemsForSave,
          notes,
          linkedHidesForSave,
          allPoImageUrls
        );
        toast.success('Purchase Order created successfully');
      }
      navigate('/procurement/orders');
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast.error('Error saving purchase order: ' + (error as Error).message);
    }
  };

  const handleExportPDF = () => {
    toast.info('PDF export functionality would be implemented here');
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/procurement/orders')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
              <Button onClick={handleCreateOrder}>
                {isEditMode ? 'Update Order' : 'Create Order'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Item Type</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost (Rs)</TableHead>
                      <TableHead>Total (Rs)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const itemType = item.itemType || 'crafting';
                      const selectedId = itemType === 'hides' ? item.hideId : item.inventoryItemId;
                      return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg?height=48&width=48';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={itemType}
                            onValueChange={(v) => handleItemChange(item.id, 'itemType', v)}
                          >
                            <SelectTrigger className="min-w-[140px]">
                              <SelectValue placeholder="Item type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hides">Hides</SelectItem>
                              <SelectItem value="crafting">Crafting Materials</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={selectedId || ''}
                            onValueChange={(id) => handleItemSelection(item.id, id)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={itemType === 'hides' ? 'Select hide' : 'Select crafting item'} />
                            </SelectTrigger>
                            <SelectContent>
                              {itemType === 'hides' ? (
                                supplierMatchedHides.length > 0 ? (
                                  supplierMatchedHides.map((hide) => (
                                    <SelectItem key={hide.id} value={hide.id}>
                                      <div className="flex items-center gap-2">
                                        {hide.imageUrls?.[0] ? (
                                          <img src={hide.imageUrls[0]} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        ) : (
                                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                        )}
                                        {hide.hideName}
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-hides" disabled>
                                    No hides available
                                  </SelectItem>
                                )
                              ) : (
                                craftingItems.length > 0 ? (
                                  craftingItems.map((inv) => (
                                    <SelectItem key={inv.id} value={inv.id}>
                                      <div className="flex items-center gap-2">
                                        {inv.imageUrl ? (
                                          <img src={inv.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        ) : (
                                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                        )}
                                        {inv.name}
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-items" disabled>
                                    No crafting items available
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {itemType === 'crafting' && item.inventoryItemId ? (
                            (() => {
                              const variants = variantsByProduct[item.inventoryItemId!] || [];
                              return variants.length > 0 ? (
                                <Select 
                                  value={item.variantId || ''} 
                                  onValueChange={(variantId) => handleVariantSelection(item.id, variantId, item.inventoryItemId!)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select variant" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {variants.map((variant) => (
                                      <SelectItem key={variant.id} value={variant.id}>
                                        {variant.variant_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              );
                            })()
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => handleItemChange(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.totalCost.toFixed(2)}
                            disabled
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-4">
                  <Button variant="outline" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t p-4">
                <div className="text-lg font-medium">Total</div>
                <div className="text-lg font-bold">Rs {calculateTotal().toFixed(2)}</div>
              </CardFooter>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Supplier Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Select Supplier</Label>
                      <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger id="supplier">
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.length > 0 ? (
                            suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-suppliers" disabled>
                              No suppliers available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedSupplier && (
                      <div className="space-y-2 bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium">
                          {suppliers.find(s => s.id === selectedSupplier)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {suppliers.find(s => s.id === selectedSupplier)?.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tel: {suppliers.find(s => s.id === selectedSupplier)?.telephone}
                        </p>
                        <p className="text-sm">
                          Payment Terms: {suppliers.find(s => s.id === selectedSupplier)?.paymentTerms}
                        </p>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/procurement/suppliers/new')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Supplier
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>PO Images (up to 5)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {poImages.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img src={url} alt={`PO ${idx + 1}`} className="w-16 h-16 object-cover rounded border" onError={(e) => { e.currentTarget.src = '/placeholder.svg?height=64&width=64'; }} />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setPoImages(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {poImageFiles.map((f, idx) => (
                        <div key={`file-${idx}`} className="relative group">
                          <img src={URL.createObjectURL(f)} alt={`New ${idx + 1}`} className="w-16 h-16 object-cover rounded border" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setPoImageFiles(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {(poImages.length + poImageFiles.length) < 5 && (
                        <button
                          type="button"
                          onClick={() => poImageInputRef.current?.click()}
                          className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center hover:bg-muted/50 transition-colors"
                        >
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={poImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const remaining = 5 - poImages.length - poImageFiles.length;
                        const toAdd = files.slice(0, remaining);
                        setPoImageFiles(prev => [...prev, ...toAdd].slice(0, remaining));
                        e.target.value = '';
                      }}
                    />
                    {isUploadingImages && <p className="text-sm text-muted-foreground">Uploading images...</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add any notes or special instructions for this order..."
                    className="min-h-[120px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreatePurchaseOrder;
