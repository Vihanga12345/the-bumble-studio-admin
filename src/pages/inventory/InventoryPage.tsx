
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
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Inventory</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage inventory items and track stock levels</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCards.map((card, index) => (
              <Card key={index} className="hover:shadow-md transition-all cursor-pointer hover-lift" onClick={() => navigate(card.path)}>
                <CardHeader className="pb-2 p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{card.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-center py-3 sm:py-4">
                    {React.cloneElement(card.icon, { className: 'h-10 w-10 sm:h-12 sm:w-12 text-primary/70' })}
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
