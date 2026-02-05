
import React from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const AnalyticsPage = () => {
  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Generate reports and visualize business metrics</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analytics Module</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <BarChart3 size={48} className="text-muted-foreground" />
                <h3 className="text-xl font-medium">Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  The Analytics module is under development. This module will provide prebuilt dashboards for sales, inventory,
                  and financials, along with customizable reports.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;
