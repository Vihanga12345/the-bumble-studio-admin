
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

const CreateSalesOrder = () => {
  const navigate = useNavigate();
  const { customers, addSalesOrder } = useSales();
  const { items } = useInventory();
  
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
        notes: notes
      });
      
      toast.success('Sales Order created successfully');
      navigate('/sales/orders');
    } catch (error) {
      console.error('Error creating sales order:', error);
      toast.error('Error creating sales order: ' + (error as Error).message);
    }
  };

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
                                    {inventoryItem.name} 
                                    {inventoryItem.currentStock <= 0 ? ' (Out of stock)' : ''}
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
