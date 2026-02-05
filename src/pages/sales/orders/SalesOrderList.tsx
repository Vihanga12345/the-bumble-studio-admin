
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ResponsiveTable from '@/components/ui/responsive-table';
import { ArrowLeft, Plus, Search, Download, FileText, Eye } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { format } from 'date-fns';
import { SalesOrderStatus } from '@/types';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const SalesOrderList = () => {
  const navigate = useNavigate();
  const { salesOrders, exportSalesOrderToPdf } = useSales();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = salesOrders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.customer && order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: SalesOrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const formatStatus = (status: SalesOrderStatus) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const exportToExcel = () => {
    try {
      // Prepare data for Excel export
      const exportData = salesOrders.map(order => ({
        'Order Number': order.orderNumber,
        'Customer': order.customer ? order.customer.name : 'Unknown',
        'Date': format(new Date(order.orderDate), 'MMM d, yyyy'),
        'Total Amount': `Rs ${order.totalAmount.toFixed(2)}`,
        'Status': formatStatus(order.status),
        'Payment Method': order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1),
        'Items Count': order.items.length
      }));
      
      // Create workbook and add worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Orders');
      
      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, 'sales_orders.xlsx');
      
      toast.success('Sales orders exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting sales orders to Excel:', error);
      toast.error('Failed to export sales orders');
    }
  };

  const handleExportToPdf = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation(); // Prevent row click
    try {
      await exportSalesOrderToPdf(orderId);
    } catch (error) {
      console.error('Error exporting sales order to PDF:', error);
    }
  };

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order Number',
      className: 'font-medium',
      render: (value: string) => value
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (value: any) => value ? value.name : 'Unknown'
    },
    {
      key: 'orderDate',
      label: 'Date',
      render: (value: Date) => format(new Date(value), 'MMM d, yyyy')
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      className: 'text-right',
      render: (value: number) => `Rs ${value.toFixed(2)}`
    },
    {
      key: 'advancePaymentAmount',
      label: 'Advance',
      className: 'text-right',
      render: (_: number, row: any) => {
        const advance = row.advancePaymentAmount ?? (row.totalAmount * 0.5);
        return `Rs ${advance.toFixed(2)}`;
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: SalesOrderStatus) => (
        <Badge className={getStatusColor(value)}>
          {formatStatus(value)}
        </Badge>
      )
    },
    {
      key: 'paymentMethod',
      label: 'Payment Method',
      render: (value: string) => <span className="capitalize">{value}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (value: any, row: any) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sales/orders/${row.id}`);
            }}
            className="h-8 w-8"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleExportToPdf(e, row.id);
            }}
            className="h-8 w-8"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl py-4 md:py-6">
        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sales')} className="h-8 w-8 md:h-10 md:w-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sales Orders</h1>
            <p className="text-sm md:text-base text-muted-foreground">View and manage customer orders</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-4 md:mb-6">
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
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={exportToExcel} className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button onClick={() => navigate('/sales/orders/new')} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl">Order History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            <ResponsiveTable
              columns={columns}
              data={filteredOrders}
              onRowClick={(order) => navigate(`/sales/orders/${order.id}`)}
              emptyMessage="No orders found. Create a new order to get started."
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SalesOrderList;
