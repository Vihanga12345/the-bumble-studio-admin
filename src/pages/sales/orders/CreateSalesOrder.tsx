
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, ArrowLeft, Package } from 'lucide-react';
import { SaleItem, InventoryItem } from '@/types';
import { toast } from 'sonner';
import { useSales } from '@/hooks/useSales';
import { useInventory } from '@/hooks/useInventory';
import { useHides } from '@/hooks/useHides';
import { getCrafterHourlyRate } from '@/lib/crafterSettings';

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  imageUrl?: string;
}

interface LinkedHideRow {
  id: string;
  hideId: string;
  productId: string;
  quantity: number;
  manHours: number;
  unitCostPerProduct: number;
  lineTotal: number;
}

interface CostLineRow {
  id: string;
  itemType: 'MATERIAL' | 'CUSTOM';
  inventoryItemId: string;
  description: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

const CreateSalesOrder = () => {
  const navigate = useNavigate();
  const { customers, addSalesOrder } = useSales();
  const { items } = useInventory();
  const { getAvailableHides } = useHides();
  
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [saleItems, setSaleItems] = useState<OrderItem[]>([
    {
      id: '1',
      productId: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      totalPrice: 0
    }
  ]);
  const [linkedHides, setLinkedHides] = useState<LinkedHideRow[]>([]);
  const [costLines, setCostLines] = useState<CostLineRow[]>([]);
  const [numberOfHours, setNumberOfHours] = useState<number>(0);
  const [hourlyFee, setHourlyFee] = useState<number>(200);

  const availableHides = getAvailableHides();
  const craftingItems = items.filter((item) => item.itemCategory === 'Crafting' && item.isActive);

  useEffect(() => {
    const loadCrafterHourlyRate = async () => {
      const rate = await getCrafterHourlyRate();
      setHourlyFee(rate);
    };

    loadCrafterHourlyRate();
  }, []);

  const handleAddItem = () => {
    setSaleItems([
      ...saleItems,
      {
        id: Date.now().toString(),
        productId: '',
        name: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        totalPrice: 0
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter(item => item.id !== id));
    } else {
      toast.error('You must have at least one item in the sales order');
    }
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: string | number) => {
    setSaleItems(
      saleItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // If productId changed, update the item name and unit price
          if (field === 'productId' && value) {
            const inventoryItem = items.find(invItem => invItem.id === value);
            if (inventoryItem) {
              updatedItem.name = inventoryItem.name;
              updatedItem.unitPrice = inventoryItem.sellingPrice;
              // Recalculate total price
              updatedItem.totalPrice = (inventoryItem.sellingPrice * updatedItem.quantity) - updatedItem.discount;
            }
          }
          
          // Recalculate total price if quantity, unit price, or discount changes
          if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
            const quantity = field === 'quantity' ? Number(value) : item.quantity;
            const unitPrice = field === 'unitPrice' ? Number(value) : item.unitPrice;
            const itemDiscount = field === 'discount' ? Number(value) : item.discount;
            updatedItem.totalPrice = (quantity * unitPrice) - itemDiscount;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const calculateSubtotal = () => {
    return saleItems.reduce((total, item) => total + ((item.quantity * item.unitPrice) - item.discount), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - discount + tax;
  };

  const handleCreateOrder = () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    const invalidItems = saleItems.filter(item => !item.productId || item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please select items and specify valid quantities');
      return;
    }

    try {
      // Convert our OrderItem[] to the required format for addSalesOrder
      const orderItems = saleItems.map(item => ({
        itemId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

      // Call our hook to save the sales order
      addSalesOrder({
        customerId: selectedCustomer,
        items: orderItems,
        paymentMethod: 'cash',
        status: 'pending',
        notes: notes,
        numberOfHours,
        hourlyFee,
        linkedHides: linkedHides
          .filter((hide) => hide.hideId)
          .map((hide) => ({
            hideId: hide.hideId,
            productId: hide.productId || null,
            quantity: hide.quantity,
            manHours: hide.manHours,
            unitCostPerProduct: hide.unitCostPerProduct,
            lineTotal: hide.lineTotal
          })),
        costLines: costLines
          .filter((line) => line.quantity > 0 && (line.itemType === 'MATERIAL' ? line.inventoryItemId : line.description.trim()))
          .map((line) => ({
            itemType: line.itemType,
            inventoryItemId: line.itemType === 'MATERIAL' ? line.inventoryItemId : null,
            description: line.description,
            quantity: line.quantity,
            unitCost: line.unitCost,
            lineTotal: line.lineTotal
          }))
      });
      
      toast.success('Sales Order created successfully');
      navigate('/sales/orders');
    } catch (error) {
      console.error('Error creating sales order:', error);
      toast.error('Error creating sales order: ' + (error as Error).message);
    }
  };

  const handleAddHide = () => {
    setLinkedHides((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        hideId: '',
        productId: '',
        quantity: 1,
        manHours: 0,
        unitCostPerProduct: 0,
        lineTotal: 0
      }
    ]);
  };

  const handleHideChange = (
    rowId: string,
    changes: Partial<{ hideId: string; productId: string; quantity: number; manHours: number; unitCostPerProduct: number }>
  ) => {
    setLinkedHides((prev) =>
      prev.map((hide) => {
        if (hide.id !== rowId) return hide;
        const next = { ...hide, ...changes };
        if (changes.hideId) {
          const selectedHide = availableHides.find((entry) => entry.id === changes.hideId);
          if (selectedHide && (changes.unitCostPerProduct === undefined || changes.unitCostPerProduct === 0)) {
            next.unitCostPerProduct = selectedHide.costPerProduct || 0;
          }
        }
        next.lineTotal = (Number(next.quantity) || 0) * (Number(next.unitCostPerProduct) || 0);
        return next;
      })
    );
  };

  const handleRemoveHide = (rowId: string) => {
    setLinkedHides((prev) => prev.filter((hide) => hide.id !== rowId));
  };

  const handleAddCostLine = () => {
    setCostLines((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        itemType: 'MATERIAL',
        inventoryItemId: '',
        description: '',
        quantity: 1,
        unitCost: 0,
        lineTotal: 0
      }
    ]);
  };

  const handleCostLineChange = (
    rowId: string,
    changes: Partial<Pick<CostLineRow, 'itemType' | 'inventoryItemId' | 'description' | 'quantity' | 'unitCost'>>
  ) => {
    setCostLines((prev) =>
      prev.map((line) => {
        if (line.id !== rowId) return line;
        const next = { ...line, ...changes };
        if (changes.itemType === 'CUSTOM') {
          next.inventoryItemId = '';
        }
        if (next.itemType === 'MATERIAL' && changes.inventoryItemId) {
          const selectedMaterial = craftingItems.find((item) => item.id === changes.inventoryItemId);
          if (selectedMaterial) {
            next.description = selectedMaterial.name;
            if (changes.unitCost === undefined || changes.unitCost === 0) {
              next.unitCost = selectedMaterial.purchaseCost || 0;
            }
          }
        }
        next.lineTotal = (Number(next.quantity) || 0) * (Number(next.unitCost) || 0);
        return next;
      })
    );
  };

  const handleRemoveCostLine = (rowId: string) => {
    setCostLines((prev) => prev.filter((line) => line.id !== rowId));
  };

  const calculateHideCostTotal = () => linkedHides.reduce((total, row) => total + row.lineTotal, 0);
  const calculateAdditionalCostLinesTotal = () => costLines.reduce((total, row) => total + row.lineTotal, 0);
  const calculateCrafterLabourCost = () => (Number(numberOfHours) || 0) * (Number(hourlyFee) || 0);
  const calculateProductionCostTotal = () =>
    calculateHideCostTotal() + calculateAdditionalCostLinesTotal() + calculateCrafterLabourCost();

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/sales/orders')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold">Create Sales Order</h1>
            </div>
            <Button onClick={handleCreateOrder}>
              Create Order
            </Button>
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
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price (Rs)</TableHead>
                      <TableHead>Discount (Rs)</TableHead>
                      <TableHead>Total (Rs)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((item) => {
                      const inventoryItem = items.find(inv => inv.id === item.productId);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {inventoryItem?.imageUrl ? (
                              <img 
                                src={inventoryItem.imageUrl} 
                                alt={inventoryItem.name}
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
                              value={item.productId} 
                              onValueChange={(value) => handleItemChange(item.id, 'productId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select an item" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map(inventoryItem => (
                                  <SelectItem 
                                    key={inventoryItem.id} 
                                    value={inventoryItem.id}
                                    disabled={inventoryItem.currentStock <= 0}
                                  >
                                    <div className="flex items-center gap-2">
                                      {inventoryItem.imageUrl ? (
                                        <img src={inventoryItem.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                      ) : (
                                        <div className="w-8 h-8 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                                          <Package className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      )}
                                      <span className="truncate">
                                        {inventoryItem.name} 
                                        {inventoryItem.currentStock <= 0 ? ' (Out of stock)' : ''}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.totalPrice.toFixed(2)}
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

                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Hide Details</h3>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddHide}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Hide
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {linkedHides.map((hide) => (
                      <div key={hide.id} className="grid grid-cols-1 md:grid-cols-7 gap-2 border rounded-md p-3">
                        <Select value={hide.hideId} onValueChange={(value) => handleHideChange(hide.id, { hideId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Available Hide" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableHides.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  <div className="flex items-center gap-2">
                                    {item.imageUrls?.[0] ? (
                                      <img src={item.imageUrls[0]} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    ) : (
                                      <div className="w-8 h-8 bg-muted rounded flex-shrink-0" />
                                    )}
                                    <span className="truncate">{item.hideName}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        <Select value={hide.productId} onValueChange={(value) => handleHideChange(hide.id, { productId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selling Item" />
                          </SelectTrigger>
                          <SelectContent>
                            {saleItems
                              .filter((line) => line.productId)
                              .map((line) => (
                                <SelectItem key={`${hide.id}-${line.id}`} value={line.productId}>
                                  {line.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Qty"
                          value={hide.quantity}
                          onChange={(e) => handleHideChange(hide.id, { quantity: parseFloat(e.target.value) || 0 })}
                        />

                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Man hours"
                          value={hide.manHours}
                          onChange={(e) => handleHideChange(hide.id, { manHours: parseFloat(e.target.value) || 0 })}
                        />

                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Cost / product"
                          value={hide.unitCostPerProduct}
                          onChange={(e) => handleHideChange(hide.id, { unitCostPerProduct: parseFloat(e.target.value) || 0 })}
                        />

                        <Input
                          type="number"
                          value={hide.lineTotal.toFixed(2)}
                          disabled
                        />

                        <Button type="button" variant="ghost" onClick={() => handleRemoveHide(hide.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {linkedHides.length === 0 && (
                      <p className="text-xs text-muted-foreground">Add one or more available hides used for this sales order.</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Crafting Materials & Other Expenses</h3>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddCostLine}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Expense Line
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {costLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-1 md:grid-cols-7 gap-2 border rounded-md p-3">
                        <Select value={line.itemType} onValueChange={(value) => handleCostLineChange(line.id, { itemType: value as 'MATERIAL' | 'CUSTOM' })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MATERIAL">Material</SelectItem>
                            <SelectItem value="CUSTOM">Custom</SelectItem>
                          </SelectContent>
                        </Select>

                        {line.itemType === 'MATERIAL' ? (
                          <Select value={line.inventoryItemId} onValueChange={(value) => handleCostLineChange(line.id, { inventoryItemId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                            <SelectContent>
                              {craftingItems.map((material) => (
                                <SelectItem key={material.id} value={material.id}>
                                  {material.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Expense description"
                            value={line.description}
                            onChange={(e) => handleCostLineChange(line.id, { description: e.target.value })}
                          />
                        )}

                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => handleCostLineChange(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                        />

                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit cost"
                          value={line.unitCost}
                          onChange={(e) => handleCostLineChange(line.id, { unitCost: parseFloat(e.target.value) || 0 })}
                        />

                        <Input
                          type="number"
                          value={line.lineTotal.toFixed(2)}
                          disabled
                        />

                        <Button type="button" variant="ghost" onClick={() => handleRemoveCostLine(line.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {costLines.length === 0 && (
                      <p className="text-xs text-muted-foreground">Add threads, glue, packing, and any custom production expenses here.</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Labour Costing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="mb-1 block">Number of hours</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={numberOfHours}
                        onChange={(e) => setNumberOfHours(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">Hourly fee (Rs)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={hourlyFee}
                        onChange={(e) => setHourlyFee(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">Crafter labour (Rs)</Label>
                      <Input
                        type="number"
                        value={calculateCrafterLabourCost().toFixed(2)}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 flex-col space-y-2">
                <div className="flex justify-between w-full">
                  <div className="text-sm font-medium">Subtotal</div>
                  <div className="text-sm font-medium">Rs {calculateSubtotal().toFixed(2)}</div>
                </div>
                <div className="flex justify-between w-full">
                  <div className="text-sm font-medium">Discount</div>
                  <div className="flex items-center">
                    <span className="mr-2">Rs</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8"
                    />
                  </div>
                </div>
                <div className="flex justify-between w-full">
                  <div className="text-sm font-medium">Tax</div>
                  <div className="flex items-center">
                    <span className="mr-2">Rs</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tax}
                      onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8"
                    />
                  </div>
                </div>
                <div className="flex justify-between w-full pt-2 border-t">
                  <div className="text-lg font-medium">Total</div>
                  <div className="text-lg font-bold">Rs {calculateTotal().toFixed(2)}</div>
                </div>
                <div className="flex justify-between w-full pt-2 border-t">
                  <div className="text-sm font-medium">Production Cost Breakdown</div>
                  <div className="text-sm font-medium">
                    Hide: Rs {calculateHideCostTotal().toFixed(2)} | Materials: Rs {calculateAdditionalCostLinesTotal().toFixed(2)} | Labour: Rs {calculateCrafterLabourCost().toFixed(2)}
                  </div>
                </div>
                <div className="flex justify-between w-full">
                  <div className="text-lg font-medium">Total Production Cost</div>
                  <div className="text-lg font-bold">Rs {calculateProductionCostTotal().toFixed(2)}</div>
                </div>
              </CardFooter>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">Select Customer</Label>
                      <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                        <SelectTrigger id="customer">
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.length > 0 ? (
                            customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-customers" disabled>
                              No customers available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedCustomer && (
                      <div className="space-y-2 bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium">
                          {customers.find(c => c.id === selectedCustomer)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customers.find(c => c.id === selectedCustomer)?.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tel: {customers.find(c => c.id === selectedCustomer)?.telephone}
                        </p>
                        {customers.find(c => c.id === selectedCustomer)?.email && (
                          <p className="text-sm text-muted-foreground">
                            Email: {customers.find(c => c.id === selectedCustomer)?.email}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/sales/customers/new')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Customer
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
                  <Input
                    placeholder="Add any notes or special instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[80px]"
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

export default CreateSalesOrder;
