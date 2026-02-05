import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { cn } from '@/lib/utils';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import {
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp
} from 'lucide-react';

const Index: React.FC = () => {
  const { currentUser } = useERPAuth();
  const navigate = useNavigate();
  
  // Define module cards
  const moduleCards = [
    {
      title: 'Procurement',
      description: 'Manage purchase orders and suppliers',
      icon: <ShoppingCart className="h-12 w-12 text-primary/70" />,
      path: '/procurement',
      roles: ['manager', 'employee']
    },
    {
      title: 'Inventory',
      description: 'Track stock levels and manage items',
      icon: <Package className="h-12 w-12 text-primary/70" />,
      path: '/inventory',
      roles: ['manager', 'employee']
    },
    {
      title: 'Sales',
      description: 'Website Orders',
      icon: <DollarSign className="h-12 w-12 text-primary/70" />,
      path: '/sales',
      roles: ['manager', 'employee']
    },
    {
      title: 'Financials',
      description: 'Track income and expenses',
      icon: <TrendingUp className="h-12 w-12 text-primary/70" />,
      path: '/financials',
      roles: ['manager']
    }
  ];

  // Filter cards based on user role
  const filteredCards = moduleCards.filter(card => 
    currentUser && card.roles.includes(currentUser.role)
  );

  return (
    <Layout>
      <div className="container mx-auto animate-fade-in">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="rounded-lg p-6 glass">
            <div className="space-y-2">
              <div className={cn(
                "inline-block text-xs font-medium rounded-full px-2.5 py-0.5 mb-2",
                currentUser?.role === 'manager' ? "bg-manager/10 text-manager" : "bg-employee/10 text-employee"
              )}>
                {currentUser?.role === 'manager' ? 'Manager' : 'Employee'}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome to <span className={cn(
                  "text-transparent bg-clip-text bg-gradient-to-r",
                  currentUser?.role === 'manager' ? "from-manager to-blue-400" : "from-employee to-green-400"
                )}>The Bumble Studio</span>
              </h1>
              <p className="text-muted-foreground">
                Select a module to get started
              </p>
            </div>
          </div>
          
          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card, index) => (
              <Card 
                key={card.title}
                className="overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer hover-lift p-6"
                onClick={() => navigate(card.path)}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={cn(
                    "p-3 rounded-full",
                    currentUser?.role === 'manager' ? "bg-manager/10" : "bg-employee/10"
                  )}>
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-1">{card.title}</h3>
                    <p className="text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
