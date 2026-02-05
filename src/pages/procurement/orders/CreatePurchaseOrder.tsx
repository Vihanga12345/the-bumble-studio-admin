
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
import { Trash2, Plus, ArrowLeft, FileText, Package } from 'lucide-react';
import { PurchaseItem } from '@/types';
import { toast } from 'sonner';
import { useSuppliers } from '@/hooks/useSuppliers';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useInventory } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';

interface PurchaseItemWithImage extends PurchaseItem {
  imageUrl?: string;
  variantId?: string;
  variantName?: string;
  inventoryItemId?: string;
}

const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { suppliers } = useSuppliers();
  const { addPurchaseOrder, updatePurchaseOrder, getPurchaseOrderById } = usePurchaseOrders();
  const { items: inventoryItems } = useInventory();
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
      imageUrl: ''
    }
  ]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, any[]>>({});

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
        setItems(mappedItems);
        mappedItems.forEach(item => {
          if (item.inventoryItemId) {
            loadVariants(item.inventoryItemId);
          }
        });
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

        if (mappedItems.length > 0) {
          setItems(mappedItems);
          mappedItems.forEach(item => {
            if (item.inventoryItemId) {
              loadVariants(item.inventoryItemId);
            }
          });
        }
      } catch (error) {
        console.error('Error loading purchase order for edit:', error);
      }
    };

    loadExistingOrder();
  }, [id, isEditMode, getPurchaseOrderById, inventoryItems]);

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

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        name: '',
        quantity: 1,
        unitCost: 0,
        totalCost: 0,
        imageUrl: ''
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

  const handleItemChange = (id: string, field: keyof PurchaseItem, value: string | number) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total cost if quantity or unit cost changes
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

  const handleItemSelection = (id: string, inventoryItemId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === inventoryItemId);
    
    if (selectedItem) {
      setItems(
        items.map(item => {
          if (item.id === id) {
            loadVariants(inventoryItemId);
            return {
              ...item,
              inventoryItemId,
              name: selectedItem.name,
              unitCost: selectedItem.purchaseCost,
              totalCost: selectedItem.purchaseCost * item.quantity,
              imageUrl: selectedItem.imageUrl || '',
              variantId: undefined,
              variantName: undefined
            };
          }
          return item;
        })
      );
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

    try {
      console.log(isEditMode ? 'Updating PO with supplier ID:' : 'Creating PO with supplier ID:', selectedSupplier);
      console.log('Items:', items);

      if (isEditMode && id) {
        await updatePurchaseOrder(id, selectedSupplier, items, notes);
        toast.success('Purchase Order updated successfully');
      } else {
        const newPO = await addPurchaseOrder(selectedSupplier, items, notes);
        console.log('Purchase order created:', newPO);
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
                      <TableHead>Item Name</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost (Rs)</TableHead>
                      <TableHead>Total (Rs)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
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
                            value={item.inventoryItemId || ''}
                            onValueChange={(inventoryItemId) => handleItemSelection(item.id, inventoryItemId)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an inventory item" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.length > 0 ? (
                                inventoryItems.map((inventoryItem) => (
                                  <SelectItem key={inventoryItem.id} value={inventoryItem.id}>
                                    {inventoryItem.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-items" disabled>
                                  No inventory items available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const variants = item.inventoryItemId ? variantsByProduct[item.inventoryItemId] || [] : [];
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
                              <span className="text-sm text-muted-foreground">No variants</span>
                            );
                          })()}
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
                    ))}
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
