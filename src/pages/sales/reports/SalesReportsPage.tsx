
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSales } from '@/hooks/useSales';
import { format, subMonths, subYears, isSameMonth, isSameYear, startOfMonth } from 'date-fns';

const SalesReportsPage = () => {
  const { salesOrders, refreshSalesData } = useSales();
  const [dateRange, setDateRange] = useState('month');
  const [selectedSalesType, setSelectedSalesType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [itemsSold, setItemsSold] = useState<any[]>([]);
  const [salesByType, setSalesByType] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    averageOrderValue: 0,
    totalOrders: 0,
    websiteSales: 0,
    manualSales: 0,
    returnedSales: 0
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getSalesTypeLabel = (orderSource: string, status: string) => {
    if (status === 'cancelled') return 'Sales Returns';
    switch (orderSource) {
      case 'website': return 'Website Sales';
      case 'manual': return 'Manual Sales Orders';
      case 'api': return 'POS Sales';
      default: return 'Manual Sales Orders';
    }
  };

  useEffect(() => {
    // Ensure we have the latest data
    refreshSalesData();
  }, [refreshSalesData]);

  useEffect(() => {
    // Filter orders based on selected filters
    let filteredOrders = salesOrders.filter(order => {
      // Status filter
      if (selectedStatus !== 'all' && order.status !== selectedStatus) return false;
      
      // Sales type filter  
      if (selectedSalesType !== 'all') {
        const salesType = getSalesTypeLabel(order.orderSource || 'manual', order.status);
        if (selectedSalesType === 'website' && salesType !== 'Website Sales') return false;
        if (selectedSalesType === 'manual' && salesType !== 'Manual Sales Orders') return false;
        if (selectedSalesType === 'pos' && salesType !== 'POS Sales') return false;
        if (selectedSalesType === 'returns' && salesType !== 'Sales Returns') return false;
      }
      
      return true;
    });

    // Calculate summary metrics
    const totalSales = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // Calculate sales by type
    const websiteSales = filteredOrders
      .filter(order => (order.orderSource || 'manual') === 'website' && order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    const manualSales = filteredOrders
      .filter(order => (order.orderSource || 'manual') === 'manual' && order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    const returnedSales = filteredOrders
      .filter(order => order.status === 'cancelled')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    setSummary({
      totalSales,
      averageOrderValue,
      totalOrders,
      websiteSales,
      manualSales,
      returnedSales
    });

    // Sales by type for pie chart
    const salesTypeData = [
      { name: 'Website Sales', value: websiteSales, count: filteredOrders.filter(o => (o.orderSource || 'manual') === 'website' && o.status !== 'cancelled').length },
      { name: 'Manual Sales', value: manualSales, count: filteredOrders.filter(o => (o.orderSource || 'manual') === 'manual' && o.status !== 'cancelled').length },
      { name: 'POS Sales', value: filteredOrders.filter(o => (o.orderSource || 'manual') === 'api' && o.status !== 'cancelled').reduce((sum, order) => sum + order.totalAmount, 0), count: filteredOrders.filter(o => (o.orderSource || 'manual') === 'api' && o.status !== 'cancelled').length },
      { name: 'Returns', value: returnedSales, count: filteredOrders.filter(o => o.status === 'cancelled').length }
    ].filter(item => item.value > 0);
    setSalesByType(salesTypeData);

    // Analyze items sold
    const itemAnalysis = new Map();
    filteredOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const itemKey = item.product?.name || item.name || 'Unknown Item';
          if (itemAnalysis.has(itemKey)) {
            const existing = itemAnalysis.get(itemKey);
            existing.quantity += item.quantity || 0;
            existing.revenue += (item.quantity || 0) * (item.unitPrice || 0);
            existing.orders += 1;
          } else {
            itemAnalysis.set(itemKey, {
              name: itemKey,
              quantity: item.quantity || 0,
              revenue: (item.quantity || 0) * (item.unitPrice || 0),
              orders: 1,
              avgPrice: item.unitPrice || 0
            });
          }
        });
      }
    });
    
    const itemsData = Array.from(itemAnalysis.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 items
    setItemsSold(itemsData);
    
    // Get recent transactions
    const sortedOrders = [...filteredOrders].sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
    setRecentTransactions(sortedOrders.slice(0, 10));
    
    // Prepare chart data
    const now = new Date();
    const monthlyData = new Map();
    const yearlyData = new Map();
    
    // Initialize with the last 6 months/years to ensure we have data points even if no sales
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const yearDate = subYears(now, i);
      
      const monthKey = format(monthDate, 'yyyy-MM');
      const yearKey = format(yearDate, 'yyyy');
      
      monthlyData.set(monthKey, { date: monthKey, sales: 0 });
      yearlyData.set(yearKey, { date: yearKey, sales: 0 });
    }
    
    // Populate with actual sales data
    filteredOrders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      const monthKey = format(orderDate, 'yyyy-MM');
      const yearKey = format(orderDate, 'yyyy');
      
      // Add to monthly data
      if (monthlyData.has(monthKey)) {
        const month = monthlyData.get(monthKey);
        month.sales += order.totalAmount;
        monthlyData.set(monthKey, month);
      }
      
      // Add to yearly data
      if (yearlyData.has(yearKey)) {
        const year = yearlyData.get(yearKey);
        year.sales += order.totalAmount;
        yearlyData.set(yearKey, year);
      }
    });
    
    // Set chart data based on selected date range
    setChartData(
      dateRange === 'month' 
        ? Array.from(monthlyData.values()) 
        : Array.from(yearlyData.values())
    );
    
  }, [salesOrders, dateRange, selectedSalesType, selectedStatus]);

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
              <Button onClick={() => window.print()}>Export PDF</Button>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sales Type:</label>
                <Select value={selectedSalesType} onValueChange={setSelectedSalesType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="website">Website Sales</SelectItem>
                    <SelectItem value="manual">Manual Sales Orders</SelectItem>
                    <SelectItem value="pos">POS Sales</SelectItem>
                    <SelectItem value="returns">Sales Returns</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Returned/Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Time Period:</label>
                <div className="space-x-2">
                  <Button
                    variant={dateRange === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('month')}
                  >
                    Monthly
                  </Button>
                  <Button
                    variant={dateRange === 'year' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('year')}
                  >
                    Yearly
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">Rs {summary.totalSales.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{summary.totalOrders} orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Website Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">Rs {summary.websiteSales.toFixed(2)}</p>
                <Badge variant="secondary">Online</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manual Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">Rs {summary.manualSales.toFixed(2)}</p>
                <Badge variant="outline">In-Store</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Returns</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">Rs {summary.returnedSales.toFixed(2)}</p>
                <Badge variant="destructive">Returned</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avg Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">Rs {summary.averageOrderValue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Per order</p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Type Distribution and Items Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {salesByType.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salesByType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {salesByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => ['Rs ' + Number(value).toFixed(2), 'Sales']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No sales data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                {itemsSold.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsSold.slice(0, 5).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">Rs {item.revenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No items data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => ['Rs ' + Number(value).toFixed(2), 'Sales']} />
                    <Bar dataKey="sales" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Transactions with Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
                  <TabsTrigger value="items">Items Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="transactions" className="mt-4">
                  {recentTransactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Order #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{format(new Date(transaction.orderDate), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="font-medium">{transaction.orderNumber}</TableCell>
                            <TableCell>{transaction.customer?.name || 'Walk-in Customer'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getSalesTypeLabel(transaction.orderSource || 'manual', transaction.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.status === 'cancelled' ? 'destructive' : 'default'}>
                                {transaction.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">Rs {transaction.totalAmount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No transactions found
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="items" className="mt-4">
                  {itemsSold.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead className="text-right">Quantity Sold</TableHead>
                          <TableHead className="text-right">Total Revenue</TableHead>
                          <TableHead className="text-right">Avg Price</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemsSold.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">Rs {item.revenue.toFixed(2)}</TableCell>
                            <TableCell className="text-right">Rs {item.avgPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{item.orders}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No items data available
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SalesReportsPage;
