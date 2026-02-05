
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, History } from 'lucide-react';
import { useERPAuth } from '@/contexts/ERPAuthContext';

const InventoryPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useERPAuth();

  const inventoryCards = [
    {
      title: 'Item Management',
      description: 'Create and edit inventory items, view stock levels',
      icon: <Package className="h-12 w-12 text-primary/70" />,
      path: '/inventory/items',
      roles: ['manager', 'employee']
    },
    {
      title: 'Inventory Transactions',
      description: 'View all stock movements and transaction history',
      icon: <History className="h-12 w-12 text-primary/70" />,
      path: '/inventory/transactions',
      roles: ['manager', 'employee']
    }
  ];

  // Filter cards based on user role
  const filteredCards = inventoryCards.filter(card => 
    currentUser && card.roles.includes(currentUser.role)
  );

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
            <p className="text-muted-foreground">Manage inventory items and track stock levels</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card, index) => (
              <Card key={index} className="hover:shadow-md transition-all cursor-pointer hover-lift" onClick={() => navigate(card.path)}>
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

export default InventoryPage;
