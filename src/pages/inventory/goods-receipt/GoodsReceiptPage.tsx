
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, Check, Package as PackageIcon } from 'lucide-react';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useInventory } from '@/hooks/useInventory';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { toast } from 'sonner';

const GoodsReceiptPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useERPAuth();
  const { purchaseOrders, updatePurchaseOrderStatus } = usePurchaseOrders();
  const { items, updateItem } = useInventory();
  
  const [selectedPO, setSelectedPO] = useState('');
  const [notes, setNotes] = useState('');
  const [receivedItems, setReceivedItems] = useState<Record<string, number>>({});
  
  // Filter POs to only show draft and sent ones
  const eligiblePOs = purchaseOrders.filter(po => ['draft', 'sent'].includes(po.status));
  
  const handleSelectPO = (poId: string) => {
    setSelectedPO(poId);
    
    // Initialize received quantities to the PO quantities
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      const initialReceivedItems: Record<string, number> = {};
      po.items.forEach(item => {
        initialReceivedItems[item.id] = item.quantity;
      });
      setReceivedItems(initialReceivedItems);
    }
  };
  
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setReceivedItems(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };
  
  const handleReceiveGoods = async () => {
    if (!selectedPO) {
      toast.error('Please select a purchase order');
      return;
    }
    
    const po = purchaseOrders.find(p => p.id === selectedPO);
    if (!po) {
      toast.error('Purchase order not found');
      return;
    }
    
    // Validate quantities
    const invalidItems = po.items.filter(item => {
      const receivedQty = receivedItems[item.id] || 0;
      return receivedQty < 0 || receivedQty > item.quantity;
    });
    
    if (invalidItems.length > 0) {
      toast.error('Some received quantities are invalid');
      return;
    }
    
    try {
      let stockUpdateCount = 0;
      
      // Update inventory using item_id reference for better accuracy
      console.log('Processing GRN for PO items:', po.items);
      console.log('Available inventory items:', items.map(item => ({ id: item.id, name: item.name })));
      
      for (const poItem of po.items) {
        const receivedQty = receivedItems[poItem.id] || 0;
        console.log(`Processing item: ${poItem.name}, receivedQty: ${receivedQty}, itemId: ${poItem.itemId}`);
        
        if (receivedQty > 0) {
          // Use item_id from purchase order item to find inventory item directly
          const inventoryItem = items.find(item => item.id === poItem.itemId);
          console.log(`Found inventory item by ID: ${inventoryItem ? inventoryItem.name : 'not found'}`);
          
          if (inventoryItem) {
            try {
              await updateItem(inventoryItem.id, {
                currentStock: inventoryItem.currentStock + receivedQty
              });
              stockUpdateCount++;
              console.log(`Updated stock for ${inventoryItem.name}: ${inventoryItem.currentStock} + ${receivedQty} = ${inventoryItem.currentStock + receivedQty}`);
            } catch (updateError) {
              console.error(`Error updating stock for ${inventoryItem.name}:`, updateError);
              toast.error(`Failed to update stock for ${inventoryItem.name}`);
            }
          } else {
            // Fallback to name matching if itemId is not available
            const inventoryItemByName = items.find(item => 
              item.name.toLowerCase().trim() === poItem.name.toLowerCase().trim()
            );
            console.log(`Found inventory item by name: ${inventoryItemByName ? inventoryItemByName.name : 'not found'}`);
            console.log(`Looking for name: "${poItem.name}", available names: [${items.map(item => `"${item.name}"`).join(', ')}]`);
            
            if (inventoryItemByName) {
              try {
                await updateItem(inventoryItemByName.id, {
                  currentStock: inventoryItemByName.currentStock + receivedQty
                });
                stockUpdateCount++;
                console.log(`Updated stock for ${inventoryItemByName.name} (by name): ${inventoryItemByName.currentStock} + ${receivedQty} = ${inventoryItemByName.currentStock + receivedQty}`);
              } catch (updateError) {
                console.error(`Error updating stock for ${inventoryItemByName.name}:`, updateError);
                toast.error(`Failed to update stock for ${inventoryItemByName.name}`);
              }
            } else {
              console.warn(`Item "${poItem.name}" not found in inventory by ID or name`);
              toast.warning(`Item "${poItem.name}" not found in inventory - stock not updated`);
            }
          }
        }
      }
      
      // Update PO status
      await updatePurchaseOrderStatus(po.id, 'received');
      
      if (stockUpdateCount > 0) {
        toast.success(`Goods received successfully! Updated stock for ${stockUpdateCount} items.`);
      } else {
        toast.success('Purchase order marked as received, but no stock was updated.');
      }
      
      // Reset form
      setSelectedPO('');
      setNotes('');
      setReceivedItems({});
    } catch (error) {
      console.error('Goods receipt error:', error);
      toast.error(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Goods Receipt</h1>
              <p className="text-muted-foreground">Record received goods from purchase orders</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Receive Goods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="purchaseOrder">Select Purchase Order</Label>
                <Select value={selectedPO} onValueChange={handleSelectPO}>
                  <SelectTrigger id="purchaseOrder">
                    <SelectValue placeholder="Select a purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligiblePOs.length > 0 ? (
                      eligiblePOs.map(po => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.orderNumber} - {po.supplier.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No eligible purchase orders
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPO && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Items to Receive</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead className="text-center">Ordered Qty</TableHead>
                          <TableHead className="text-center">Received Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrders.find(p => p.id === selectedPO)?.items.map(item => {
                          const inventoryItem = items.find(inv => inv.id === item.itemId || inv.name === item.name);
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                {inventoryItem?.imageUrl ? (
                                  <img 
                                    src={inventoryItem.imageUrl} 
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder.svg?height=48&width=48';
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                    <PackageIcon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.quantity}
                                  value={receivedItems[item.id] || 0}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                  className="text-center"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any additional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <Button onClick={handleReceiveGoods} className="w-full">
                    <Check className="mr-2 h-4 w-4" />
                    Complete Goods Receipt
                  </Button>
                </>
              )}
              
              {!selectedPO && eligiblePOs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                  <Package size={48} className="text-muted-foreground" />
                  <h3 className="text-xl font-medium">No Purchase Orders to Receive</h3>
                  <p className="text-muted-foreground max-w-md">
                    There are no purchase orders in 'draft' or 'sent' status to receive goods for.
                    Create a purchase order first.
                  </p>
                  <Button onClick={() => navigate('/procurement/orders/new')}>
                    Create Purchase Order
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default GoodsReceiptPage;
