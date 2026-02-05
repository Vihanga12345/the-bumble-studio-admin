
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveTable from '@/components/ui/responsive-table';
import { ShoppingCart, Plus, Search, FileText, ArrowLeft, Eye } from 'lucide-react';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { toast } from 'sonner';

const PurchaseOrderList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { purchaseOrders, exportOrderToPdf } = usePurchaseOrders();

  useEffect(() => {
    console.log('Current purchase orders:', purchaseOrders);
  }, [purchaseOrders]);

  const filteredOrders = purchaseOrders.filter(order => 
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleExportPDF = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await exportOrderToPdf(orderId);
    } catch (error) {
      console.error('Error exporting purchase order to PDF:', error);
    }
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/procurement/orders/${orderId}`);
  };

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order Number',
      className: 'font-medium',
      render: (value: string) => value
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (value: any) => value?.name || 'Unknown'
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (value: Date) => value.toLocaleDateString()
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      className: 'text-right',
      render: (value: number) => `Rs ${value.toFixed(2)}`
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (value: any, row: any) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewOrder(row.id);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleExportPDF(row.id, e);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:gap-6">
          {/* Header */}
          <div className="flex items-center gap-3 md:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/procurement')} 
              className="h-8 w-8 md:h-10 md:w-10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Purchase Orders</h1>
              <p className="text-sm md:text-base text-muted-foreground">Manage your purchase orders</p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search orders..."
                className="pl-8 w-full sm:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => navigate('/procurement/orders/new')} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>

          {/* Table/Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg md:text-xl">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Orders
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              <ResponsiveTable
                columns={columns}
                data={filteredOrders}
                onRowClick={(order) => handleViewOrder(order.id)}
                emptyMessage="No purchase orders found. Create a new one to get started."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PurchaseOrderList;
