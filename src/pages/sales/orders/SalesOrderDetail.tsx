
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableFooter, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, FileDown, Printer, Package } from 'lucide-react';
import { format } from 'date-fns';
import { SalesOrderStatus } from '@/types';
import { useSales } from '@/hooks/useSales';
import { useInventory } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { deleteImage, uploadMultipleImages } from '@/lib/uploadUtils';

interface OrderImage {
  id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

const SalesOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { salesOrders, updateSalesOrder, fetchSalesOrders } = useSales();
  const { items, adjustStock } = useInventory();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [order, setOrder] = useState(id ? salesOrders.find(order => order.id === id) : null);
  const [newStatus, setNewStatus] = useState<SalesOrderStatus | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderImages, setOrderImages] = useState<OrderImage[]>([]);
  const [linkedHides, setLinkedHides] = useState<any[]>([]);
  const [engravingLines, setEngravingLines] = useState<Array<{ id: string; description: string; amount: number }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sale' | 'craft'>('sale');
  const [advanceInput, setAdvanceInput] = useState<string>('');
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);
  
  useEffect(() => {
    if (id) {
      const salesOrder = salesOrders.find(order => order.id === id);
      setOrder(salesOrder);
      if (salesOrder) {
        setNewStatus(salesOrder.status);
        setAdvanceInput(String(salesOrder.advancePaymentAmount ?? ''));
      }
    }
  }, [id, salesOrders]);

  const fetchOrderImages = async (orderId: string) => {
    const { data, error } = await supabase
      .from('order_images')
      .select('id, image_url, sort_order, created_at')
      .eq('order_id', orderId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching order images:', error);
      toast.error('Failed to load order images');
      return;
    }

    setOrderImages((data || []) as OrderImage[]);
  };

  useEffect(() => {
    const fetchLinkedHides = async () => {
      if (!order?.id) return;
      const { data, error } = await (supabase as any)
        .from('sales_order_hides')
        .select(`
          *,
          hides(hide_name),
          inventory_items(name)
        `)
        .eq('sales_order_id', order.id);
      if (error) {
        console.error('Failed to load linked hides:', error);
        return;
      }
      setLinkedHides(data || []);
    };
    fetchLinkedHides();
  }, [order?.id]);

  useEffect(() => {
    const fetchEngravings = async () => {
      if (!order?.id) return;
      const { data, error } = await (supabase as any)
        .from('sales_order_cost_lines')
        .select('id, description, unit_cost')
        .eq('sales_order_id', order.id)
        .eq('item_type', 'CUSTOM');

      if (error) {
        console.error('Failed to load engraving lines:', error);
        setEngravingLines([]);
        return;
      }

      setEngravingLines(
        (data || []).map((row: any) => ({
          id: row.id,
          description: row.description || 'Engraving',
          amount: Number(row.unit_cost || 0),
        }))
      );
    };
    fetchEngravings();
  }, [order?.id]);

  useEffect(() => {
    if (order?.id) {
      fetchOrderImages(order.id);
    }
  }, [order?.id]);

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = Math.max(0, 12 - orderImages.length);
    if (remainingSlots === 0) {
      toast.error('Maximum of 12 images reached for this order');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validated: File[] = [];
    for (const file of files) {
      validated.push(file);
      if (validated.length >= remainingSlots) break;
    }

    if (validated.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFiles(validated);
  };

  const handleUploadImages = async () => {
    if (!order?.id || selectedFiles.length === 0) return;

    const remainingSlots = Math.max(0, 12 - orderImages.length);
    const filesToUpload = selectedFiles.slice(0, remainingSlots);
    if (filesToUpload.length === 0) {
      toast.error('Maximum of 12 images reached for this order');
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrls = await uploadMultipleImages(filesToUpload, `orders/${order.id}`);
      const payload = uploadedUrls.map((url, index) => ({
        order_id: order.id,
        image_url: url,
        sort_order: orderImages.length + index
      }));

      const { error } = await supabase.from('order_images').insert(payload);
      if (error) {
        throw error;
      }

      toast.success('Order images uploaded');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchOrderImages(order.id);
    } catch (error) {
      console.error('Error uploading order images:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!order?.id) return;

    try {
      const deletedFromStorage = await deleteImage(imageUrl);
      if (!deletedFromStorage) {
        toast.error('Failed to delete image from storage');
        return;
      }

      const { error } = await supabase
        .from('order_images')
        .delete()
        .eq('id', imageId);

      if (error) {
        throw error;
      }

      toast.success('Image deleted');
      await fetchOrderImages(order.id);
    } catch (error) {
      console.error('Error deleting order image:', error);
      toast.error('Failed to delete image');
    }
  };
  
  const MANUAL_WORKFLOW_STATUSES = [
    'Order Confirmed', 'Advance Paid', 'Leathers Selected', 'Cut Pieces', 'Stitching',
    'Burnishing', 'Packed', 'Remaining Amount Paid', 'Delivered'
  ] as const;

  const deriveOrderStatus = (workflowStatus: string): 'Order Confirmed' | 'Advance Paid' | 'Full Payment Done' => {
    if (workflowStatus === 'Remaining Amount Paid' || workflowStatus === 'Delivered') return 'Full Payment Done';
    if (workflowStatus !== 'Order Confirmed') return 'Advance Paid';
    return 'Order Confirmed';
  };

  const handleStatusChange = async (status: SalesOrderStatus) => {
    if (!id || !order) return;
    
    setIsUpdating(true);
    try {
      const previousStatus = order.status;
      
      if (status === 'completed' && previousStatus !== 'completed') {
        const orderItems = order.items || [];
        for (const item of orderItems) {
          if (item.product && item.quantity > 0) {
            try {
              await adjustStock(
                item.product.id,
                -item.quantity,
                'sale' as any,
                `Stock issued for Sales Order ${order.orderNumber}`
              );
            } catch (error) {
              console.error('Error decreasing stock:', error);
              toast.error(`Error updating inventory for ${item.product.name}`);
            }
          }
        }
      }
      
      const updates: Partial<typeof order> = { status };
      if (order.orderSource === 'manual') {
        updates.order_status = deriveOrderStatus(status);
      }
      await updateSalesOrder(id, updates);
      
      const updatedOrder = {
        ...order,
        status,
        ...(updates.order_status && { order_status: updates.order_status })
      };
      
      setOrder(updatedOrder);
      setNewStatus(status);
      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      toast.error(`Failed to update status: ${(error as Error).message}`);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleExportPdf = async () => {
    try {
      const { generateSalesOrderPDF } = await import('@/lib/pdfGenerator');
      await generateSalesOrderPDF(order!);
      toast.success('Order exported to PDF');
    } catch (error) {
      toast.error(`Failed to export: ${(error as Error).message}`);
    }
  };

  const handleSaveAdvance = async () => {
    if (!id || !order) return;
    const advance = parseFloat(advanceInput);
    if (isNaN(advance) || advance < 0) {
      toast.error('Please enter a valid advance payment amount');
      return;
    }
    const totalAmt = Number((order as any).totalAmount ?? (order as any).total_amount ?? 0);
    const remaining = Math.max(totalAmt - advance, 0);

    // Decide the high-level order_status that triggers the DB finance record
    const currentWorkflowStatus = (order as any).status || 'Order Confirmed';
    const newOrderStatus = advance > 0 ? 'Advance Paid' : 'Order Confirmed';
    // Only bump workflow status if it hasn't moved past 'Order Confirmed' yet
    const newWorkflowStatus =
      advance > 0 && currentWorkflowStatus === 'Order Confirmed'
        ? 'Advance Paid'
        : currentWorkflowStatus;

    setIsSavingAdvance(true);
    try {
      // Update sales order — also set order_status so the DB trigger
      // (handle_order_stock_and_finance) fires and writes the finance record.
      const { error } = await supabase
        .from('sales_orders')
        .update({
          advance_payment_amount: advance,
          remaining_balance: remaining,
          order_status: newOrderStatus,
          status: newWorkflowStatus,
        })
        .eq('id', id);
      if (error) throw error;

      // Refresh the hook so re-opening the order shows the saved amount
      await fetchSalesOrders();
      setOrder((prev: any) =>
        prev
          ? { ...prev, advancePaymentAmount: advance, remainingBalance: remaining, status: newWorkflowStatus }
          : prev
      );
      toast.success('Advance payment saved and recorded in finance');
    } catch (err) {
      toast.error(`Failed to save: ${(err as Error).message}`);
    } finally {
      setIsSavingAdvance(false);
    }
  };
  
  if (!order) {
    return (
      <Layout>
        <div className="container mx-auto p-4">
          <div className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl font-bold">Order Not Found</h2>
            <p className="text-muted-foreground mt-2 mb-4">The sales order you're looking for doesn't exist or has been deleted.</p>
            <Button onClick={() => navigate('/sales/orders')}>Back to Orders</Button>
          </div>
        </div>
      </Layout>
    );
  }
  
  const rawOrder = order as any;
  const subtotalAmount = Number(rawOrder.subtotalAmount ?? rawOrder.subtotal_amount ?? 0);
  const discountAmount = Number(rawOrder.discountAmount ?? rawOrder.discount_amount ?? 0);
  const additionalCosts = Number(rawOrder.additionalCosts ?? rawOrder.additional_costs ?? 0);
  const deliveryCost = Number(rawOrder.deliveryCost ?? rawOrder.delivery_cost ?? 0);
  const hasSubtotalBreakdown = subtotalAmount > 0;
  const saleTotal = hasSubtotalBreakdown
    ? Math.max(subtotalAmount - discountAmount + additionalCosts + deliveryCost, 0)
    : order.totalAmount;
  const advanceAmount = order.advancePaymentAmount ?? 0;
  const remainingAmount = order.remainingBalance ?? Math.max(saleTotal - advanceAmount, 0);
  const formatRs = (amount: number) => `Rs ${Number(amount || 0).toFixed(2)}`;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-[130px_1fr] items-start gap-3 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="break-words">{value}</span>
    </div>
  );
  
  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/sales/orders')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Sales Order {order.orderNumber}</h1>
                <p className="text-sm text-muted-foreground">
                  Created {format(new Date(order.orderDate), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPdf}>
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'sale' | 'craft')}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="sale">Sale Details</TabsTrigger>
              <TabsTrigger value="craft">Craft Details</TabsTrigger>
            </TabsList>

            <TabsContent value="sale" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoRow label="Name" value={order.customerName || order.customer?.name || 'Walk-in Customer'} />
                    <InfoRow label="Address" value={order.shippingAddress || order.customer?.address || 'No address provided'} />
                    <InfoRow label="Phone" value={order.customerPhone || order.customer?.telephone || '-'} />
                    <InfoRow label="Email" value={order.customerEmail || order.customer?.email || '-'} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sales Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoRow label="Order Number" value={order.orderNumber} />
                    <InfoRow label="Order Date" value={format(new Date(order.orderDate), 'MMM d, yyyy')} />
                    <InfoRow label="Last Updated" value={format(new Date(order.updatedAt), 'MMM d, yyyy')} />
                    <InfoRow label="Payment Method" value={order.paymentMethod} />
                    <InfoRow
                      label={order.orderSource === 'manual' ? 'Workflow / Status' : 'Production Workflow'}
                      value={
                        <Select
                          value={newStatus || order.status || 'pending'}
                          onValueChange={(value) => handleStatusChange(value as SalesOrderStatus)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {order.orderSource === 'manual' ? (
                              MANUAL_WORKFLOW_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      }
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Amounts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoRow label="Subtotal" value={formatRs(subtotalAmount || order.totalAmount)} />
                    <InfoRow label="Engraving" value={formatRs(additionalCosts)} />
                    <InfoRow label="Delivery" value={formatRs(deliveryCost)} />
                    <InfoRow label="Sale Total" value={<span className="font-semibold">{formatRs(saleTotal)}</span>} />
                    <InfoRow
                      label="Advance"
                      value={
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={advanceInput}
                            onChange={e => setAdvanceInput(e.target.value)}
                            className="w-32 h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            placeholder="0.00"
                          />
                          <button
                            onClick={handleSaveAdvance}
                            disabled={isSavingAdvance}
                            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                          >
                            {isSavingAdvance ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      }
                    />
                    <InfoRow
                      label="Balance"
                      value={
                        <span className="font-semibold">
                          {formatRs(Math.max(saleTotal - (parseFloat(advanceInput) || advanceAmount), 0))}
                        </span>
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item) => {
                        const inventoryItem = items.find(inv => inv.id === item.productId);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              {inventoryItem?.imageUrl ? (
                                <img
                                  src={inventoryItem.imageUrl}
                                  alt={item.product?.name || 'Product'}
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
                            <TableCell className="font-medium">{item.product?.name || 'Unknown Product'}</TableCell>
                            <TableCell className="text-right">{formatRs(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatRs(item.discount)}</TableCell>
                            <TableCell className="text-right">{formatRs(item.totalPrice)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5}>Sale Total</TableCell>
                        <TableCell className="text-right">{formatRs(saleTotal)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>

              {engravingLines.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Engravings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Text</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {engravingLines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>{line.description}</TableCell>
                            <TableCell className="text-right">{formatRs(line.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="craft" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hide Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hide</TableHead>
                        <TableHead>Selling Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Man Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedHides.length > 0 ? (
                        linkedHides.map((link: any) => (
                          <TableRow key={link.id}>
                            <TableCell>{link.hides?.hide_name || 'Hide'}</TableCell>
                            <TableCell>{link.inventory_items?.name || '-'}</TableCell>
                            <TableCell className="text-right">{Number(link.quantity || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{Number(link.man_hours || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No hides linked to this sales order
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Craft Images</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFilesSelected}
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUploadImages}
                      disabled={!selectedFiles.length || isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Upload Selected'}
                    </Button>
                  </div>
                  {selectedFiles.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFiles.length} file(s) selected
                    </p>
                  )}
                  {orderImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {orderImages.map((image) => (
                        <div key={image.id} className="border rounded p-2 space-y-2">
                          <img
                            src={image.image_url}
                            alt="Order reference"
                            className="w-full h-36 object-cover rounded"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => handleDeleteImage(image.id, image.image_url)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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

export default SalesOrderDetail;
