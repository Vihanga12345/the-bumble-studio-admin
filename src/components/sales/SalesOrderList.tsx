
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Plus, FileText } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SalesOrderList = () => {
  const navigate = useNavigate();
  const { salesOrders, refreshSalesData } = useSales();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    refreshSalesData();
  }, [refreshSalesData]);

  const filteredOrders = salesOrders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.customer && order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleExportPDF = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real app, this would generate a PDF
    toast.success(`Order ${orderId} exported as PDF`);
  };

  const handleViewOrder = (orderId: string) => {
    // Navigate to order details page
    navigate(`/sales/orders/${orderId}`);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl">Sales Orders</CardTitle>
          
          <div className="flex gap-2">
            <div className="relative w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search orders..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button onClick={() => navigate('/sales/orders/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((salesOrder) => (
                <TableRow key={salesOrder.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleViewOrder(salesOrder.id)}>
                  <TableCell className="font-medium">{salesOrder.orderNumber}</TableCell>
                  <TableCell>{salesOrder.customer ? salesOrder.customer.name : 'Walk-in Customer'}</TableCell>
                  <TableCell>{salesOrder.orderDate.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge 
                      className={cn(
                        getStatusBadgeVariant(salesOrder.status)
                      )}
                    >
                      {salesOrder.status.charAt(0).toUpperCase() + salesOrder.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">Rs {salesOrder.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewOrder(salesOrder.id); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => handleExportPDF(salesOrder.id, e)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No orders found matching your search' : 'No sales orders yet. Create your first order to get started.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SalesOrderList;
