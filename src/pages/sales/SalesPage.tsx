import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { 
  ShoppingBag,
  PlusCircle
} from 'lucide-react';

const SalesPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useERPAuth();

  const salesModules = [
    {
      title: 'Create Manual Sales Order',
      description: 'Create a custom sales order with customer details',
      icon: PlusCircle,
      path: '/sales/orders/manual',
      color: 'bg-blue-500',
      count: 0
    },
    {
      title: 'Website Orders',
      description: 'Manage orders from e-commerce website',
      icon: ShoppingBag,
      path: '/sales/website-orders',
      color: 'bg-purple-500',
      count: 0
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Sales Module</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage orders from your e-commerce website
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesModules.map((module, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:bg-muted/50 transition-colors border rounded-lg"
                onClick={() => navigate(module.path)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-base sm:text-lg font-medium">{module.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {module.description}
                    </p>
                    <div className="flex justify-center mt-2">
                      <module.icon className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
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

export default SalesPage;
