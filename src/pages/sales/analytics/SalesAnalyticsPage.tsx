import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import {
  ArrowLeft,
  BarChart3,
  Package,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { format, startOfYear, subMonths } from 'date-fns';
import { useSales } from '@/hooks/useSales';
import { useInventory } from '@/hooks/useInventory';
import {
  getDefaultAnalyticsFilters,
  useSalesAnalytics,
  type SalesAnalyticsFilters,
  type SalesChannelFilter,
} from '@/hooks/useSalesAnalytics';

function buildMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const start = startOfYear(subMonths(now, 12));
  let cursor = start;
  while (cursor <= now) {
    options.push({
      value: format(cursor, 'yyyy-MM'),
      label: format(cursor, 'MMM yyyy'),
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return options;
}

const MONTH_OPTIONS = buildMonthOptions();

const PIE_COLORS = [
  '#1F4C38',
  '#3B7359',
  '#C39A22',
  '#2F6B4F',
  '#5FA549',
  '#8B6914',
  '#4A7C59',
  '#D4A935',
  '#6B7280',
];

const formatCurrency = (value: number) =>
  `Rs ${value.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatCurrencyExact = (value: number) =>
  `Rs ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SalesAnalyticsPage = () => {
  const navigate = useNavigate();
  const { salesOrders, isLoading, refreshSalesData } = useSales();
  const { items } = useInventory();
  const [filters, setFilters] = useState<SalesAnalyticsFilters>(getDefaultAnalyticsFilters);

  useEffect(() => {
    refreshSalesData();
  }, [refreshSalesData]);

  const productOptions = useMemo(
    () =>
      items
        .filter((item) => item.itemCategory === 'Selling' && item.isActive && !item.isVariant)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const monthOptions = useMemo(() => {
    const map = new Map(MONTH_OPTIONS.map((o) => [o.value, o]));
    [filters.startMonth, filters.endMonth].forEach((value) => {
      if (value && !map.has(value)) {
        try {
          const [y, m] = value.split('-').map(Number);
          const d = new Date(y, m - 1, 1);
          map.set(value, { value, label: format(d, 'MMM yyyy') });
        } catch {
          // ignore
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value));
  }, [filters.startMonth, filters.endMonth]);

  const { monthlyTrend, productSales, pieData, summary } = useSalesAnalytics(salesOrders, filters);

  const updateFilter = <K extends keyof SalesAnalyticsFilters>(
    key: K,
    value: SalesAnalyticsFilters[K]
  ) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'startMonth' && typeof value === 'string' && value > next.endMonth) {
        next.endMonth = value;
      }
      if (key === 'endMonth' && typeof value === 'string' && value < next.startMonth) {
        next.startMonth = value;
      }
      return next;
    });
  };

  const channelLabel =
    filters.channel === 'all'
      ? 'All Sales (Manual + Website)'
      : filters.channel === 'manual'
        ? 'Manual Sales Only'
        : 'Website Sales Only';

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/sales')}
              className="mt-0.5 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-primary" />
                Sales Analytics
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Order trends, product performance, and sales distribution
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refreshSalesData()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Change From / To months anytime — all charts update for the selected period and sales type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Sales Type</Label>
                <Select
                  value={filters.channel}
                  onValueChange={(value) => updateFilter('channel', value as SalesChannelFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sales type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales (Manual + Website)</SelectItem>
                    <SelectItem value="manual">Manual Sales Only</SelectItem>
                    <SelectItem value="website">Website Sales Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Month</Label>
                <Select
                  value={filters.startMonth}
                  onValueChange={(value) => updateFilter('startMonth', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Start month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={`start-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>To Month</Label>
                <Select
                  value={filters.endMonth}
                  onValueChange={(value) => updateFilter('endMonth', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="End month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={`end-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={filters.productId}
                  onValueChange={(value) => updateFilter('productId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {productOptions.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Orders</p>
                  <p className="text-2xl font-bold mt-1">{summary.totalOrders}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(summary.totalRevenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Order</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(summary.averageOrderValue)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Units Sold</p>
                  <p className="text-2xl font-bold mt-1">{summary.totalUnits}</p>
                </div>
                <Package className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {filters.channel === 'all' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Manual Sales</p>
                  <p className="text-lg font-semibold mt-1">{formatCurrency(summary.manualRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{summary.manualOrders} orders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Website Sales</p>
                  <p className="text-lg font-semibold mt-1">{formatCurrency(summary.websiteRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{summary.websiteOrders} orders</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Order Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Trend Analysis</CardTitle>
            <CardDescription>
              Monthly order volume and revenue — {channelLabel}
              {filters.productId !== 'all' ? ' · filtered by selected product' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyTrend.every((m) => m.orders === 0) ? (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                No orders found for the selected filters.
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis
                      yAxisId="orders"
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Orders', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                    />
                    <YAxis
                      yAxisId="revenue"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'Revenue' ? formatCurrencyExact(value) : value
                      }
                    />
                    <Legend />
                    <Bar
                      yAxisId="orders"
                      dataKey="orders"
                      name="Orders"
                      fill="#1F4C38"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Line
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#C39A22"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product-wise + Pie */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product-wise Sales</CardTitle>
              <CardDescription>
                Revenue by product for the selected period and sales type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productSales.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                  No product sales for the selected filters.
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productSales.slice(0, 12)}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(name: string) =>
                          name.length > 16 ? `${name.slice(0, 16)}…` : name
                        }
                      />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === 'Revenue' ? formatCurrencyExact(value) : value
                        }
                      />
                      <Bar dataKey="revenue" name="Revenue" fill="#3B7359" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sales Distribution</CardTitle>
              <CardDescription>
                Product contribution to total sales (%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                  No distribution data for the selected filters.
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={45}
                        paddingAngle={2}
                        label={({ percentage }) => `${percentage.toFixed(0)}%`}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props) => [
                          formatCurrencyExact(value),
                          `${name} (${(props.payload?.percentage ?? 0).toFixed(1)}%)`,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(value: string) =>
                          value.length > 22 ? `${value.slice(0, 22)}…` : value
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Product table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product Sales Breakdown</CardTitle>
            <CardDescription>
              Detailed product contribution for {channelLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productSales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No product data available for the selected filters.
              </p>
            ) : (
              <div className="admin-table-wrapper overflow-x-auto">
                <Table className="admin-responsive-table">
                  <TableHeader className="admin-table-head">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Line Items</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="admin-table-body">
                    {productSales.map((product) => (
                      <TableRow key={product.productId} className="admin-table-row">
                        <TableCell className="admin-table-td font-medium">{product.name}</TableCell>
                        <TableCell className="admin-table-td text-right">{product.quantity}</TableCell>
                        <TableCell className="admin-table-td text-right">{product.orders}</TableCell>
                        <TableCell className="admin-table-td text-right">
                          {formatCurrencyExact(product.revenue)}
                        </TableCell>
                        <TableCell className="admin-table-td text-right">
                          {product.percentage.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SalesAnalyticsPage;
