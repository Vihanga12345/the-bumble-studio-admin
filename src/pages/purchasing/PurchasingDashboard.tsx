
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Users, Package, ArrowLeft, FileText } from 'lucide-react';
import { useERPAuth } from '@/contexts/ERPAuthContext';

const PurchasingDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useERPAuth();

  const purchasingCards = [
    {
      title: 'Purchase Orders',
      description: 'Create and manage purchase orders for suppliers',
      icon: <ShoppingCart className="h-12 w-12 text-primary/70" />,
      path: '/purchasing/orders',
      roles: ['manager', 'employee']
    },
    {
      title: 'Suppliers',
      description: 'Manage supplier information and contacts',
      icon: <Users className="h-12 w-12 text-primary/70" />,
      path: '/purchasing/suppliers',
      roles: ['manager', 'employee']
    },
    {
      title: 'Goods Receipt',
      description: 'Record received goods and update inventory',
      icon: <Package className="h-12 w-12 text-primary/70" />,
      path: '/purchasing/goods-receipt',
      roles: ['manager', 'employee']
    },
    {
      title: 'Returns/Refunds',
      description: 'Process returns and update inventory',
      icon: <ArrowLeft className="h-12 w-12 text-primary/70" />,
      path: '/purchasing/returns',
      roles: ['manager', 'employee']
    },
    {
      title: 'Reports',
      description: 'View purchasing reports and analytics',
      icon: <FileText className="h-12 w-12 text-primary/70" />,
      path: '/purchasing/reports',
      roles: ['manager']
    }
  ];

  // Filter cards based on user role
  const filteredCards = purchasingCards.filter(card => 
    currentUser && card.roles.includes(currentUser.role)
  );

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Purchasing</h1>
              <p className="text-muted-foreground">Manage purchase orders, suppliers, and goods receipt</p>
            </div>
            <Button onClick={() => navigate('/purchasing/orders/new')}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Create Purchase Order
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card, index) => (
              <Card key={index} className="hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(card.path)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {card.title}
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center py-4">
                    {card.icon}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PurchasingDashboard;
