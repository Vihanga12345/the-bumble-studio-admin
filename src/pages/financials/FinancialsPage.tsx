
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { FileText } from 'lucide-react';

const FinancialsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useERPAuth();

  const modules = [
    {
      title: 'Transactions',
      description: 'Record and track all financial transactions',
      icon: <FileText className="h-6 w-6 text-gray-500" />,
      path: '/financials/transactions'
    },
    
  ];

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
            <p className="text-muted-foreground">
              Track income, expenses, and monitor financial performance
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:bg-muted/50 transition-colors border rounded-lg"
                onClick={() => navigate(module.path)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-medium">{module.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                    <div className="flex justify-center mt-2">
                      {module.icon}
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

export default FinancialsPage;
