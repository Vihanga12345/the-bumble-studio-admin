
import React, { useState, useEffect } from 'react';
import { Customer, InventoryItem, SaleItem } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, CreditCard, Banknote } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useSales } from '@/hooks/useSales';
import { toast } from 'sonner';

const CreateSalesOrder = () => {
  const { items, fetchItems } = useInventory();
  const { customers, addSalesOrder, fetchCustomers, refreshSalesData } = useSales();
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderNotes, setOrderNotes] = useState('');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch data when component mounts
    const loadData = async () => {
      await fetchItems();
      await fetchCustomers();
    };
    
    loadData();
  }, [fetchItems, fetchCustomers]);

  const handleAddToCart = () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    const product = items.find(item => item.id === selectedProduct);
    
    if (!product) {
      toast.error('Product not found');
      return;
    }

    if (product.currentStock < quantity) {
      toast.error(`Not enough stock. Available: ${product.currentStock}`);
      return;
    }

    const existingItemIndex = cartItems.findIndex(item => item.productId === selectedProduct);

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cartItems];
      const updatedQuantity = updatedCart[existingItemIndex].quantity + quantity;
      
      if (product.currentStock < updatedQuantity) {
        toast.error(`Not enough stock. Available: ${product.currentStock}`);
        return;
      }
      
      updatedCart[existingItemIndex].quantity = updatedQuantity;
      updatedCart[existingItemIndex].totalPrice = updatedQuantity * product.sellingPrice;
      setCartItems(updatedCart);
    } else {
      // Add new item
      const newItem: SaleItem = {
        id: `temp-${Date.now()}`,
        productId: product.id,
        quantity,
        unitPrice: product.sellingPrice,
        discount: 0,
        totalPrice: quantity * product.sellingPrice,
        product
      };
      
      setCartItems([...cartItems, newItem]);
    }

    // Reset selection
    setSelectedProduct('');
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async () => {
    try {
      if (cartItems.length === 0) {
        toast.error('Cart is empty');
        return;
      }

      setIsLoading(true);

      // Transform cart items to required format
      const orderItems = cartItems.map(item => ({
        itemId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

      // Create the order
      await addSalesOrder({
        customerId: selectedCustomer || undefined,
        items: orderItems,
        paymentMethod: paymentMethod as 'cash' | 'card' | 'bank',
        status: 'pending',
        notes: orderNotes
      });

      // Reset the form
      setCartItems([]);
      setSelectedCustomer('');
      setOrderNotes('');
      
      // Refresh data to show the new order
      await refreshSalesData();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Selection */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Create Sales Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="product">Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {items.filter(item => item.currentStock > 0).map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - (Rs {item.sellingPrice.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div className="flex items-end">
              <Button className="w-full" onClick={handleAddToCart}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
          
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Price (Rs)</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.length > 0 ? (
                  cartItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell className="text-right">Rs {item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">Rs {item.totalPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No items added to this order yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customer">Customer (Optional)</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Walk-in Customer</SelectItem>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <div className="flex gap-2 mt-1">
              <Button 
                type="button"
                variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                className="flex-1"
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Cash
              </Button>
              <Button 
                type="button"
                variant={paymentMethod === 'card' ? 'default' : 'outline'} 
                className="flex-1"
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Card
              </Button>
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Order Notes</Label>
            <Input
              id="notes"
              placeholder="Add notes for this order"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-medium">
              <span>Total Amount</span>
              <span>Rs {calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            disabled={cartItems.length === 0 || isLoading}
            onClick={handleCreateOrder}
          >
            {isLoading ? 'Creating Order...' : 'Create Order'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateSalesOrder;
