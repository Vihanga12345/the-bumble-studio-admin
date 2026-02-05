
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSales } from '@/hooks/useSales';
import { useInventory } from '@/hooks/useInventory';
import { Search, Plus, Trash2, CreditCard, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentMethod } from '@/types';

const POSPage = () => {
  const { customers, addSalesOrder } = useSales();
  const { items, adjustStock } = useInventory();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  
  // Load data on component mount
  useEffect(() => {
    console.log('Items available for POS:', items);
  }, [items]);
  
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const addToCart = (item: any) => {
    const existingItemIndex = cartItems.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex !== -1) {
      // If item already exists in cart, increment quantity
      const updatedCart = [...cartItems];
      updatedCart[existingItemIndex].quantity += 1;
      updatedCart[existingItemIndex].totalPrice = updatedCart[existingItemIndex].quantity * updatedCart[existingItemIndex].price;
      setCartItems(updatedCart);
    } else {
      // Add new item to cart
      setCartItems([
        ...cartItems,
        {
          id: item.id,
          name: item.name,
          price: item.sellingPrice || 0,
          quantity: 1,
          totalPrice: item.sellingPrice || 0
        }
      ]);
    }
  };
  
  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };
  
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const updatedCart = [...cartItems];
    updatedCart[index].quantity = quantity;
    updatedCart[index].totalPrice = quantity * updatedCart[index].price;
    setCartItems(updatedCart);
  };
  
  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2);
  };
  


  const handleCheckout = async () => {
    try {
      if (cartItems.length === 0) {
        toast.error('Cart is empty');
        return;
      }
      
      // Create sales order
      const orderItems = cartItems.map(item => ({
        itemId: item.id,
        quantity: item.quantity,
        unitPrice: item.price
      }));
      
      const newSalesOrder = await addSalesOrder({
        customerId: selectedCustomer === '' || selectedCustomer === 'walk-in' ? null : selectedCustomer,
        items: orderItems,
        paymentMethod: paymentMethod,
        status: 'delivered', // Use 'delivered' which is confirmed to work in the database
        notes: 'POS Sale',
        orderSource: 'api' // Mark as POS sale to distinguish from manual sales orders
      });
      
            // Update inventory - reduce stock for each item
      for (const item of cartItems) {
        await adjustStock(
          item.id, 
          -item.quantity, 
          'counting_error', 
          `Stock reduced due to sale: ${newSalesOrder?.orderNumber || 'POS Sale'}`
        );
      }

      // Order is already created as 'delivered' since POS sales are immediate

      toast.success('Sale completed successfully!');
      console.log('Sale processed:', newSalesOrder);
      
      // Clear cart
      setCartItems([]);
      setSelectedCustomer('');
      setPaymentMethod('cash');
      
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error(`Error: ${(error as Error).message}`);
    }
  };

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value as PaymentMethod);
  };
  
  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left side - Items */}
          <div className="md:w-2/3 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name or SKU"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <Card key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => addToCart(item)}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.sku || 'No SKU'}</p>
                        </div>
                        <p className="font-bold">Rs {item.sellingPrice?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-muted-foreground">Stock: {item.currentStock || 0}</p>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No items found matching your search
                </div>
              )}
            </div>
          </div>
          
          {/* Right side - Cart */}
          <div className="md:w-1/3">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Current Sale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Customer (Optional)</label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {cartItems.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-6 w-6 p-0" 
                                  onClick={() => updateQuantity(index, item.quantity - 1)}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-6 w-6 p-0" 
                                  onClick={() => updateQuantity(index, item.quantity + 1)}
                                >
                                  +
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">Rs {item.totalPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0" 
                                onClick={() => removeFromCart(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      Cart is empty
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>Rs {calculateTotal()}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Payment Method</label>
                    <div className="flex gap-2 mt-1">
                      <Button 
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                        className="flex-1"
                        onClick={() => handlePaymentMethodChange('cash')}
                      >
                        <Banknote className="h-4 w-4 mr-2" />
                        Cash
                      </Button>
                      <Button 
                        variant={paymentMethod === 'card' ? 'default' : 'outline'} 
                        className="flex-1"
                        onClick={() => handlePaymentMethodChange('card')}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Card
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={cartItems.length === 0}
                  onClick={handleCheckout}
                >
                  Complete Sale
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default POSPage;
