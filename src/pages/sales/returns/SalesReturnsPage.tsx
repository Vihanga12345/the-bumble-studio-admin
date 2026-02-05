
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSales } from '@/hooks/useSales';
import { useInventory } from '@/hooks/useInventory';
import { toast } from 'sonner';
import { Search, Loader2, X, Plus, Minus, Download, FileText, Printer, PackageCheck, PackageX } from 'lucide-react';
import { PaymentMethod, SalesOrderStatus } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFinancials } from '@/hooks/useFinancials';
import { Separator } from '@/components/ui/separator';

const SalesReturnsPage = () => {
  const navigate = useNavigate();
  const { salesOrders, fetchSalesOrders, updateSalesOrder } = useSales();
  const { items, adjustStock } = useInventory();
  const { addTransaction } = useFinancials();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchSalesOrders();
  }, [fetchSalesOrders]);

  // Filter orders that can be returned (delivered, completed, or shipped orders - excludes cancelled/returned orders)
  const filteredOrders = salesOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const isReturnable = ['delivered', 'completed', 'shipped'].includes(order.status);
    return matchesSearch && isReturnable;
  });

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
    setReturnItems([]); // Clear previously selected items
  };

  const handleItemSelect = (item) => {
    const existingItemIndex = returnItems.findIndex(ri => ri.itemId === item.itemId);

    if (existingItemIndex > -1) {
      // Item already selected, remove it
      const updatedReturnItems = [...returnItems];
      updatedReturnItems.splice(existingItemIndex, 1);
      setReturnItems(updatedReturnItems);
    } else {
      // Item not selected, add it with a default quantity of 1
      setReturnItems([...returnItems, { itemId: item.itemId, quantity: 1, unitPrice: item.unitPrice, product: item.product }]);
    }
  };

  const updateReturnQuantity = (itemId, newQuantity) => {
    if (newQuantity < 0) return;

    setReturnItems(returnItems.map(item =>
      item.itemId === itemId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const calculateItemTotal = (item) => {
    return item.quantity * item.unitPrice;
  };

  const calculateTotalReturnAmount = () => {
    return returnItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const totalReturnAmount = calculateTotalReturnAmount();

  const handleProcessReturn = async () => {
    if (!selectedOrder) {
      toast.error('Please select an order to process a return');
      return;
    }

    if (returnItems.length === 0) {
      toast.error('No items have been selected for return');
      return;
    }

    setIsProcessing(true);
    try {
      // Update inventory stock for returned items
      for (const returnItem of returnItems) {
        // Find the inventory item by productId (which should match inventory item id)
        const inventoryItem = items.find(item => item.id === returnItem.itemId);
        
        if (inventoryItem) {
          // Use adjustStock function to increase inventory
          await adjustStock(
            inventoryItem.id, 
            returnItem.quantity, // Positive quantity to increase stock
            'counting_error', // Using existing adjustment type
            `Return from Sales Order ${selectedOrder.orderNumber} - ${returnItem.quantity} ${inventoryItem.name} returned`
          );
          console.log(`Increased stock for ${inventoryItem.name}: +${returnItem.quantity}`);
        } else {
          console.warn(`Inventory item not found for returned item: ${returnItem.itemId}`);
        }
      }

      // Process the return logic
      const updatedItems = selectedOrder.items.map(item => {
        const returnedItem = returnItems.find(ri => ri.itemId === item.productId);
        if (returnedItem) {
          return { ...item, quantity: item.quantity - returnedItem.quantity };
        }
        return item;
      });

      // Update the sales order status to cancelled (returned orders are effectively cancelled)
      await updateSalesOrder(selectedOrder.id, { status: 'cancelled' as SalesOrderStatus });

      // Create a financial transaction record with all required parameters
      await addTransaction(
        'expense',
        totalReturnAmount,
        'returns',
        `Return for Order #${selectedOrder.orderNumber}`,
        new Date(),
        selectedOrder.paymentMethod,
        `RET-${selectedOrder.orderNumber}`
      );

      toast.success(`Return processed successfully! Stock updated for ${returnItems.length} items. Order marked as cancelled.`);
      navigate('/sales/orders'); // Redirect to sales orders page
    } catch (error) {
      console.error('Error processing return:', error);
      toast.error(`Error processing return: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Sales Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Selection */}
              <div>
                <Label htmlFor="orderSearch">Search Order:</Label>
                <Input
                  type="search"
                  id="orderSearch"
                  placeholder="Enter order number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredOrders.length} order(s) available for return
                </p>
                <Select onValueChange={(value) => {
                  const order = salesOrders.find(o => o.orderNumber === value);
                  handleOrderSelect(order);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredOrders.map((order) => {
                      // Determine order source for display
                      const getOrderSourceLabel = (order) => {
                        if (order.orderSource === 'website') return 'Website Sale';
                        if (order.orderSource === 'api') return 'POS Sale';
                        return 'Manual Sale';
                      };
                      
                      return (
                        <SelectItem key={order.id} value={order.orderNumber}>
                          <div className="flex flex-col">
                            <span className="font-medium">{order.orderNumber} - {order.customer?.name || 'Walk-in Customer'}</span>
                            <span className="text-sm text-muted-foreground">
                              {getOrderSourceLabel(order)} • Rs {order.totalAmount.toFixed(2)} • {order.status}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedOrder && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold">Order Details</h3>
                    <p>Order Number: {selectedOrder.orderNumber}</p>
                    <p>Customer: {selectedOrder.customer?.name || 'Walk-in Customer'}</p>
                    <p>Order Date: {selectedOrder.orderDate.toLocaleDateString()}</p>
                    <p>Total Amount: Rs {selectedOrder.totalAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* Return Items Selection */}
              <div>
                <Label>Select Items for Return:</Label>
                {selectedOrder ? (
                  <div className="mt-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between py-2 border-b">
                        <div className="flex-1">
                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded text-primary-500 focus:ring-primary-500"
                              checked={returnItems.some(ri => ri.itemId === item.productId)}
                              onChange={() => handleItemSelect(item)}
                            />
                            <span>{item.product.name}</span>
                          </label>
                        </div>
                        {returnItems.some(ri => ri.itemId === item.productId) && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateReturnQuantity(item.productId, Math.max(0, returnItems.find(ri => ri.itemId === item.productId).quantity - 1))}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{returnItems.find(ri => ri.itemId === item.productId).quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateReturnQuantity(item.productId, returnItems.find(ri => ri.itemId === item.productId).quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Select an order to view items.</p>
                )}
              </div>
            </div>
            <Separator className="my-4" />
            {/* Notes and Process Return */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="notes">Notes:</Label>
                <Input
                  type="text"
                  id="notes"
                  placeholder="Add notes about the return..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mb-4"
                />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <div className="text-lg font-semibold">
                    Total Return Amount: Rs {totalReturnAmount.toFixed(2)}
                  </div>
                  <Button
                    disabled={!selectedOrder || returnItems.length === 0 || isProcessing}
                    onClick={handleProcessReturn}
                  >
                    {isProcessing ? (
                      <>
                        Processing <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        Process Return <PackageX className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SalesReturnsPage;
