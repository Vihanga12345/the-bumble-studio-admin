import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useInventory } from '@/hooks/useInventory';
import { useSales } from '@/hooks/useSales';
import { toast } from 'sonner';
import { ShoppingCart as ShoppingCartIcon, Search, Loader2, X, Plus, Minus, Download, FileText, Printer } from 'lucide-react';
import { PaymentMethod } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFinancials } from '@/hooks/useFinancials';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <Card className="h-full flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardContent className="p-2 md:p-4">
        <h3 className="font-medium mb-1 md:mb-2 text-sm md:text-base line-clamp-2 min-h-[2.5rem] md:min-h-[3rem]">
          {product.name}
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-sm md:text-base">Rs {product.sellingPrice.toFixed(2)}</p>
            <span className="text-xs text-muted-foreground">Stock: {product.currentStock}</span>
          </div>
          <Button 
            onClick={() => onAddToCart(product)}
            disabled={product.currentStock <= 0}
            size="sm"
            className="w-full text-xs md:text-sm h-8 md:h-9"
          >
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ProductSearch = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search products..."
        className="pl-8"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
};

const CartItem = ({ item, onQuantityChange, onRemove }) => {
  return (
    <div className="flex items-center justify-between py-2 md:py-3 border-b last:border-b-0">
      <div className="flex-1 min-w-0 mr-2">
        <p className="font-medium text-sm md:text-base truncate">{item.product.name}</p>
        <p className="text-xs md:text-sm text-muted-foreground">Rs {item.unitPrice.toFixed(2)} each</p>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <Button 
          variant="outline" 
          size="icon"
          className="h-6 w-6 md:h-8 md:w-8"
          onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))}
        >
          <Minus className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
        <span className="w-6 md:w-8 text-center text-sm md:text-base font-medium">{item.quantity}</span>
        <Button 
          variant="outline" 
          size="icon"
          className="h-6 w-6 md:h-8 md:w-8"
          onClick={() => onQuantityChange(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6 md:h-8 md:w-8 text-destructive ml-1"
          onClick={() => onRemove(item.id)}
        >
          <X className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  );
};

const CartPanel = ({ cartItems, customers, selectedCustomer, onSelectCustomer, onQuantityChange, onRemove, onCheckout, totalAmount }) => {
  return (
    <Card className="h-full flex flex-col max-h-[calc(100vh-8rem)] md:max-h-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg md:text-xl">Shopping Cart</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto px-3 md:px-6">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[150px] md:h-[200px] text-center text-muted-foreground">
            <ShoppingCartIcon className="h-8 w-8 md:h-12 md:w-12 mb-2 opacity-20" />
            <p className="text-sm md:text-base">Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="mb-3 md:mb-4">
              <Select
                value={selectedCustomer || "walk-in"}
                onValueChange={onSelectCustomer}
              >
                <SelectTrigger className="h-9 md:h-10">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:space-y-3">
              {cartItems.map((item) => (
                <CartItem 
                  key={item.id} 
                  item={item} 
                  onQuantityChange={onQuantityChange} 
                  onRemove={onRemove} 
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
      <div className="p-3 md:p-4 border-t">
        <div className="w-full flex justify-between items-center text-lg md:text-xl font-bold mb-3 md:mb-4">
          <span>Total</span>
          <span>Rs {totalAmount.toFixed(2)}</span>
        </div>
        <Button 
          className="w-full h-10 md:h-11" 
          disabled={cartItems.length === 0}
          onClick={onCheckout}
        >
          Checkout
        </Button>
      </div>
    </Card>
  );
};

const BillReceipt = ({ orderData, onPrint, onClose }) => {
  return (
    <div className="bg-white p-4 rounded-lg">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Sales Receipt</h2>
        <p>Order #{orderData.orderNumber}</p>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
        </p>
      </div>

      <div className="mb-4">
        <p><strong>Customer:</strong> {orderData.customerName}</p>
        <p><strong>Payment Method:</strong> {orderData.paymentMethod}</p>
      </div>

      <table className="w-full mb-4">
        <thead className="border-b">
          <tr>
            <th className="text-left py-2">Item</th>
            <th className="text-center py-2">Qty</th>
            <th className="text-right py-2">Price</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {orderData.items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2">{item.product.name}</td>
              <td className="text-center py-2">{item.quantity}</td>
              <td className="text-right py-2">Rs {item.unitPrice.toFixed(2)}</td>
              <td className="text-right py-2">Rs {item.totalPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between font-semibold mb-4">
        <span>Total</span>
        <span>Rs {orderData.totalAmount.toFixed(2)}</span>
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
      </div>
    </div>
  );
};

const POSPage = () => {
  const navigate = useNavigate();
  const { items } = useInventory();
  const { customers, salesOrders, addSalesOrder, fetchCustomers, fetchSalesOrders } = useSales();
  const { addTransaction } = useFinancials();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('walk-in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [completedSales, setCompletedSales] = useState([]);
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchSalesOrders();
  }, [fetchCustomers, fetchSalesOrders]);

  useEffect(() => {
    const formattedSales = salesOrders
      .filter(order => order.status === 'completed')
      .map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        date: new Date(order.orderDate),
        customer: order.customer ? order.customer.name : 'Walk-in Customer',
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        items: order.items
      }));
    setCompletedSales(formattedSales);
  }, [salesOrders]);
  
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    item.isActive && 
    item.currentStock > 0
  );
  
  const addToCart = (product) => {
    const existingItem = cartItems.find(cartItem => cartItem.productId === product.id);
    
    if (existingItem) {
      setCartItems(cartItems.map(cartItem => 
        cartItem.productId === product.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1, totalPrice: (cartItem.quantity + 1) * cartItem.unitPrice } 
          : cartItem
      ));
    } else {
      setCartItems([...cartItems, {
        id: uuidv4(),
        productId: product.id,
        quantity: 1,
        unitPrice: product.sellingPrice,
        discount: 0,
        totalPrice: product.sellingPrice,
        product: product
      }]);
    }
  };
  
  const removeFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };
  
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const item = cartItems.find(item => item.id === itemId);
    if (!item) return;
    
    const product = items.find(i => i.id === item.productId);
    if (!product) return;
    
    if (newQuantity > product.currentStock) {
      toast.error(`Only ${product.currentStock} units available in stock`);
      return;
    }
    
    setCartItems(cartItems.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice } 
        : item
    ));
  };
  
  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const generateReceiptPDF = async (orderData) => {
    try {
      const { generatePOSReceiptPDF } = await import('@/lib/pdfGenerator');
      
      const receiptData = {
        receiptNumber: orderData.orderNumber,
        date: new Date(orderData.date),
        items: orderData.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        subtotal: orderData.totalAmount,
        tax: 0, // Add tax calculation if needed
        discount: 0, // Add discount calculation if needed
        total: orderData.totalAmount,
        paymentMethod: orderData.paymentMethod,
        cashier: 'System' // Add actual cashier name if available
      };
      
      generatePOSReceiptPDF(receiptData);
      toast.success('Receipt generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate receipt: ' + (error as Error).message);
    }
  };
  
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formattedItems = cartItems.map(item => ({
        itemId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));
      
      let customerId;
      if (selectedCustomer === 'walk-in' || !selectedCustomer) {
        customerId = undefined;
      } else {
        customerId = selectedCustomer;
      }
      
      const order = await addSalesOrder({
        customerId,
        items: formattedItems,
        paymentMethod: paymentMethod as PaymentMethod,
        notes: notes || '',
        status: 'completed'
      });
      
      const transactionAmount = calculateTotal();
      
      // Use object parameter style for addTransaction
      await addTransaction({
        type: 'income',
        amount: transactionAmount,
        category: 'sales',
        description: `POS Sale #${order.orderNumber}`,
        date: new Date(),
        paymentMethod: paymentMethod as PaymentMethod
      });
      
      const customerName = selectedCustomer && selectedCustomer !== 'walk-in'
        ? customers.find(c => c.id === selectedCustomer)?.name || 'Walk-in Customer'
        : 'Walk-in Customer';
        
      const billData = {
        orderNumber: order.orderNumber,
        date: new Date(),
        customerName,
        paymentMethod,
        items: cartItems,
        totalAmount: calculateTotal()
      };
      
      setCurrentBill(billData);
      setShowBillDialog(true);
      
      toast.success('Sale completed successfully');
      
      setCompletedSales([{
        id: order.id,
        orderNumber: order.orderNumber,
        date: new Date(),
        customer: customerName,
        paymentMethod: paymentMethod,
        totalAmount: transactionAmount,
        items: cartItems
      }, ...completedSales]);
      
      setCartItems([]);
      setNotes('');
      
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Failed to process sale: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePrintBill = async (orderData) => {
    try {
      await generateReceiptPDF(orderData);
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Failed to download receipt: ' + (error as Error).message);
    }
  };
  
  const handleViewBill = (sale) => {
    const customerName = sale.customer;
    
    const billData = {
      orderNumber: sale.orderNumber,
      date: sale.date,
      customerName,
      paymentMethod: sale.paymentMethod,
      items: sale.items,
      totalAmount: sale.totalAmount
    };
    
    setCurrentBill(billData);
    setShowBillDialog(true);
  };
  
  const exportToExcel = () => {
    try {
      if (completedSales.length === 0) {
        toast.error("No sales data to export");
        return;
      }
      
      const salesData = completedSales.map(sale => ({
        'Order Number': sale.orderNumber,
        'Date': sale.date.toLocaleDateString(),
        'Customer': sale.customer,
        'Payment Method': sale.paymentMethod,
        'Total Amount': `Rs ${sale.totalAmount.toFixed(2)}`
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(salesData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
      
      XLSX.writeFile(workbook, 'Sales_Report.xlsx');
      
      toast.success('Sales data exported to Excel');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export sales data: ' + (error as Error).message);
    }
  };
  
  useEffect(() => {
    if (paymentStatus === 'success') {
      // Use object parameter style for addTransaction
      addTransaction({
        type: 'income',
        amount: calculateTotal(),
        category: 'sales',
        description: `POS Sale - ${new Date().toISOString()}`,
        date: new Date(),
        paymentMethod: paymentMethod as PaymentMethod
      });
      
      setCompletedSales([{
        id: uuidv4(),
        orderNumber: 'POS Sale - ' + new Date().toISOString(),
        date: new Date(),
        customer: 'Walk-in Customer',
        paymentMethod: paymentMethod,
        totalAmount: calculateTotal(),
        items: cartItems
      }, ...completedSales]);
      
      setCartItems([]);
      setNotes('');
    }
  }, [paymentStatus]);
  
  return (
    <Layout>
      <div className="container mx-auto p-2 md:p-4 max-w-7xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Point of Sale</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <Card className="mb-4 md:mb-6">
              <CardHeader className="pb-3 md:pb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <CardTitle className="text-lg md:text-xl">Products</CardTitle>
                  <div className="w-full sm:w-auto">
                    <ProductSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <ProductCard key={item.id} product={item} onAddToCart={addToCart} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      {searchTerm ? `No products found matching "${searchTerm}"` : 'No products available'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Recent Sales - Hidden on mobile to save space */}
            <Card className="hidden lg:block">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg md:text-xl">Recent Sales</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportToExcel}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted">
                      <tr>
                        <th className="px-4 py-2">Order #</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Customer</th>
                        <th className="px-4 py-2">Amount</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSales.length > 0 ? (
                        completedSales.map((sale) => (
                          <tr key={sale.id} className="border-b">
                            <td className="px-4 py-2 font-mono text-xs">{sale.orderNumber.substring(0, 20)}...</td>
                            <td className="px-4 py-2">{sale.date.toLocaleDateString()}</td>
                            <td className="px-4 py-2">{sale.customer}</td>
                            <td className="px-4 py-2">Rs {sale.totalAmount.toFixed(2)}</td>
                            <td className="px-4 py-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewBill(sale)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-center text-muted-foreground">
                            No sales recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Cart Panel */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="sticky top-4">
              <CartPanel
                cartItems={cartItems}
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onQuantityChange={updateQuantity}
                onRemove={removeFromCart}
                onCheckout={handleCheckout}
                totalAmount={calculateTotal()}
              />
            </div>
          </div>
        </div>
      </div>
      
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sales Receipt</DialogTitle>
          </DialogHeader>
          {currentBill && (
            <BillReceipt 
              orderData={currentBill}
              onPrint={() => handlePrintBill(currentBill)}
              onClose={() => setShowBillDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default POSPage;
