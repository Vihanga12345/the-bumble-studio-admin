
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableFooter
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useInventory } from '@/hooks/useInventory';
import { ArrowLeft, FileText, X, Printer, FileDown, Ban, Package, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const PurchaseOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getPurchaseOrderById, 
    updatePurchaseOrderStatus,
    exportOrderToPdf,
    isLoading 
  } = usePurchaseOrders();
  const { items: inventoryItems } = useInventory();
  
  const [order, setOrder] = useState(id ? getPurchaseOrderById(id) : null);
  
  useEffect(() => {
    if (id) {
      const purchaseOrder = getPurchaseOrderById(id);
      setOrder(purchaseOrder);
    }
  }, [id, getPurchaseOrderById]);

  useEffect(() => {
    const loadOrderItems = async () => {
      if (!order || order.items.length > 0) return;
      try {
        const { data, error } = await supabase
          .from('purchase_order_items')
          .select('*')
          .eq('purchase_order_id', order.id);

        if (error) {
          console.error('Error loading purchase order items:', error);
          return;
        }

        const mappedItems = (data || []).map(item => {
          const inventoryItem = inventoryItems.find(inv => inv.id === item.item_id);
          return {
            id: item.id,
            name: inventoryItem?.name || item.name || 'Unknown Item',
            quantity: item.quantity,
            unitCost: item.unit_cost,
            totalCost: item.total_cost,
            receivedQuantity: item.received_quantity || 0,
            itemId: item.item_id
          };
        });

        if (mappedItems.length > 0) {
          setOrder(prev => prev ? { ...prev, items: mappedItems } : prev);
        }
      } catch (error) {
        console.error('Error loading purchase order items:', error);
      }
    };

    loadOrderItems();
  }, [order, inventoryItems]);

  const handleExportPdf = async () => {
    if (!id) return;
    
    try {
      await exportOrderToPdf(id);
    } catch (error) {
      toast.error(`Failed to export: ${(error as Error).message}`);
    }
  };
  
  if (!order) {
    return (
      <Layout>
        <div className="container">
          <div className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl font-bold mb-2">Purchase Order Not Found</h2>
            <p className="text-muted-foreground mb-4">The purchase order you're looking for doesn't exist or has been deleted.</p>
            <Button onClick={() => navigate('/procurement/orders')}>
              Back to Purchase Orders
            </Button>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/procurement/orders')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Purchase Order {order.orderNumber}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Created: {format(new Date(order.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/procurement/orders/${order.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPdf}>
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Ban className="h-4 w-4" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Purchase Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this purchase order? This will reduce stock.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No, keep it</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        await updatePurchaseOrderStatus(id!, 'cancelled');
                        setOrder(getPurchaseOrderById(id!));
                        toast.success('Purchase order cancelled');
                      }}
                    >
                      Yes, cancel it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-lg">{order.supplier.name}</p>
                    <p className="text-muted-foreground">{order.supplier.address}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Phone:</span> {order.supplier.telephone}</p>
                    <p><span className="font-medium">Payment Terms:</span> {order.supplier.paymentTerms}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Order Number:</span>
                    <span>{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Created Date:</span>
                    <span>{format(new Date(order.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Last Updated:</span>
                    <span>{format(new Date(order.updatedAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-semibold">Rs {order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const inventoryItem = inventoryItems.find(inv => inv.id === item.itemId || inv.name === item.name);
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
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">Rs {item.unitCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Rs {item.totalCost.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>Total</TableCell>
                    <TableCell className="text-right">Rs {order.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
          
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PurchaseOrderDetail;
