
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PurchaseOrder, PurchaseOrderStatus } from '@/types';

// Mock data for purchase orders
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    orderNumber: 'PO-2023-001',
    supplier: {
      id: '1',
      name: 'ABC Suppliers',
      telephone: '123-456-7890',
      address: '123 Main St, Anytown',
      paymentTerms: 'Net 30',
      createdAt: new Date('2023-01-01')
    },
    items: [
      {
        id: '1',
        name: 'Office Chair',
        quantity: 5,
        unitCost: 100,
        totalCost: 500
      }
    ],
    totalAmount: 500,
    status: 'draft',
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01')
  },
  {
    id: '2',
    orderNumber: 'PO-2023-002',
    supplier: {
      id: '2',
      name: 'XYZ Electronics',
      telephone: '987-654-3210',
      address: '456 Market St, Othertown',
      paymentTerms: 'Net 15',
      createdAt: new Date('2023-02-01')
    },
    items: [
      {
        id: '2',
        name: 'Laptop',
        quantity: 2,
        unitCost: 1200,
        totalCost: 2400
      }
    ],
    totalAmount: 2400,
    status: 'sent',
    createdAt: new Date('2023-06-05'),
    updatedAt: new Date('2023-06-05')
  },
  {
    id: '3',
    orderNumber: 'PO-2023-003',
    supplier: {
      id: '3',
      name: 'Office Supplies Co.',
      telephone: '555-123-4567',
      address: '789 Office Park, Businesstown',
      paymentTerms: 'Net 45',
      createdAt: new Date('2023-03-01')
    },
    items: [
      {
        id: '3',
        name: 'Printer Paper',
        quantity: 20,
        unitCost: 5,
        totalCost: 100
      }
    ],
    totalAmount: 100,
    status: 'received',
    createdAt: new Date('2023-06-10'),
    updatedAt: new Date('2023-06-15')
  }
];

const PurchaseOrderList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);

  const filteredOrders = purchaseOrders.filter(order => 
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
              <p className="text-muted-foreground">Manage your purchase orders</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search orders..."
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => navigate('/purchasing/orders/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Orders
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/purchasing/orders/${order.id}`)}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.supplier.name}</TableCell>
                        <TableCell>{order.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">Rs {order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={cn(getStatusColor(order.status))}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // PDF export functionality would go here
                              console.log('Export PDF for order', order.id);
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No purchase orders found. Create a new one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PurchaseOrderList;
