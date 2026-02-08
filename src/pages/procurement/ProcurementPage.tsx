
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Truck, FileText } from 'lucide-react';
import { useERPAuth } from '@/contexts/ERPAuthContext';

const ProcurementPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useERPAuth();

  const procurementCards = [
    {
      title: 'Purchase Orders',
      description: 'View and manage existing purchase orders',
      icon: <FileText className="h-12 w-12 text-primary/70" />,
      path: '/procurement/orders',
      roles: ['manager', 'employee']
    },
    {
      title: 'Suppliers',
      description: 'Manage supplier information and contacts',
      icon: <Truck className="h-12 w-12 text-primary/70" />,
      path: '/procurement/suppliers',
      roles: ['manager', 'employee']
    }
  ];

  // Filter cards based on user role
  const filteredCards = procurementCards.filter(card => 
    currentUser && card.roles.includes(currentUser.role)
  );

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Procurement</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Manage purchase orders and suppliers</p>
            </div>
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

export default ProcurementPage;
