
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const ReturnsPage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Returns/Refunds</h1>
              <p className="text-muted-foreground">Process returns to suppliers and update inventory</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/procurement')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Procurement
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Returns Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <RefreshCw size={48} className="text-muted-foreground" />
                <h3 className="text-xl font-medium">This feature is coming soon</h3>
                <p className="text-muted-foreground max-w-md">
                  The Returns functionality is under development. This page will allow you to select a PO/GRN to reverse,
                  specify returned quantities, and update your inventory accordingly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ReturnsPage;
