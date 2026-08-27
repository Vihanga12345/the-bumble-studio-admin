import { useMemo } from 'react';
import {
  format,
  startOfYear,
  startOfMonth,
  endOfMonth,
  parse,
  isWithinInterval,
  eachMonthOfInterval,
} from 'date-fns';
import type { SalesOrder } from '@/types';

export type SalesChannelFilter = 'all' | 'manual' | 'website';

export interface SalesAnalyticsFilters {
  channel: SalesChannelFilter;
  startMonth: string; // yyyy-MM
  endMonth: string;   // yyyy-MM
  productId: string;  // 'all' | product uuid
}

export interface MonthlyTrendPoint {
  month: string;      // yyyy-MM
  label: string;      // MMM yyyy
  orders: number;
  revenue: number;
}

export interface ProductSalesPoint {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface SalesAnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalUnits: number;
  manualOrders: number;
  websiteOrders: number;
  manualRevenue: number;
  websiteRevenue: number;
}

const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'returned']);

export function getDefaultAnalyticsFilters(): SalesAnalyticsFilters {
  const now = new Date();
  return {
    channel: 'all',
    startMonth: format(startOfYear(now), 'yyyy-MM'),
    endMonth: format(now, 'yyyy-MM'),
    productId: 'all',
  };
}

function getOrderChannel(order: SalesOrder): 'manual' | 'website' | 'other' {
  const source = (order.orderSource || 'manual').toLowerCase();
  if (source === 'website') return 'website';
  if (source === 'manual') return 'manual';
  return 'other';
}

function isCancelled(order: SalesOrder): boolean {
  return CANCELLED_STATUSES.has((order.status || '').toLowerCase());
}

function getOrderMonthKey(order: SalesOrder): string {
  return format(new Date(order.orderDate), 'yyyy-MM');
}

function monthBounds(startMonth: string, endMonth: string) {
  const start = startOfMonth(parse(startMonth, 'yyyy-MM', new Date()));
  const end = endOfMonth(parse(endMonth, 'yyyy-MM', new Date()));
  return { start, end };
}

export function useSalesAnalytics(orders: SalesOrder[], filters: SalesAnalyticsFilters) {
  return useMemo(() => {
    const { start, end } = monthBounds(filters.startMonth, filters.endMonth);

    // Ensure start <= end
    const rangeStart = start <= end ? start : end;
    const rangeEnd = start <= end ? end : start;

    const channelFiltered = orders.filter((order) => {
      if (isCancelled(order)) return false;

      const orderDate = new Date(order.orderDate);
      if (!isWithinInterval(orderDate, { start: rangeStart, end: rangeEnd })) return false;

      const channel = getOrderChannel(order);
      if (filters.channel === 'manual' && channel !== 'manual') return false;
      if (filters.channel === 'website' && channel !== 'website') return false;
      // 'all' = manual + website (exclude POS/api/other)
      if (filters.channel === 'all' && channel === 'other') return false;

      return true;
    });

    // Product filter applied for product charts / when a specific product is selected
    const productFiltered = channelFiltered.filter((order) => {
      if (filters.productId === 'all') return true;
      return (order.items || []).some((item) => item.productId === filters.productId);
    });

    // For order trend: when a product is selected, only count orders containing that product
    const trendOrders = productFiltered;

    // Monthly trend
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    const monthlyMap = new Map<string, MonthlyTrendPoint>();
    months.forEach((monthDate) => {
      const key = format(monthDate, 'yyyy-MM');
      monthlyMap.set(key, {
        month: key,
        label: format(monthDate, 'MMM yyyy'),
        orders: 0,
        revenue: 0,
      });
    });

    trendOrders.forEach((order) => {
      const key = getOrderMonthKey(order);
      const point = monthlyMap.get(key);
      if (!point) return;

      if (filters.productId === 'all') {
        point.orders += 1;
        point.revenue += order.totalAmount || 0;
      } else {
        const matchingItems = (order.items || []).filter((item) => item.productId === filters.productId);
        if (matchingItems.length === 0) return;
        point.orders += 1;
        point.revenue += matchingItems.reduce(
          (sum, item) => sum + (item.totalPrice ?? item.quantity * item.unitPrice),
          0
        );
      }
    });

    const monthlyTrend = Array.from(monthlyMap.values());

    // Product-wise sales (from channel-filtered orders in date range)
    const productMap = new Map<string, ProductSalesPoint>();
    channelFiltered.forEach((order) => {
      (order.items || []).forEach((item) => {
        const productId = item.productId || 'unknown';
        if (filters.productId !== 'all' && productId !== filters.productId) return;

        const name = item.product?.name || (item as { name?: string }).name || 'Unknown Product';
        const revenue = item.totalPrice ?? (item.quantity || 0) * (item.unitPrice || 0);
        const existing = productMap.get(productId);
        if (existing) {
          existing.quantity += item.quantity || 0;
          existing.revenue += revenue;
          existing.orders += 1;
        } else {
          productMap.set(productId, {
            productId,
            name,
            quantity: item.quantity || 0,
            revenue,
            orders: 1,
            percentage: 0,
          });
        }
      });
    });

    const productSalesRaw = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    const productRevenueTotal = productSalesRaw.reduce((sum, p) => sum + p.revenue, 0);
    const productSales = productSalesRaw.map((p) => ({
      ...p,
      percentage: productRevenueTotal > 0 ? (p.revenue / productRevenueTotal) * 100 : 0,
    }));

    // Pie chart: top products + "Other" if many
    const TOP_PIE = 8;
    let pieData: { name: string; value: number; percentage: number }[] = [];
    if (productSales.length <= TOP_PIE) {
      pieData = productSales.map((p) => ({
        name: p.name,
        value: p.revenue,
        percentage: p.percentage,
      }));
    } else {
      const top = productSales.slice(0, TOP_PIE);
      const otherRevenue = productSales.slice(TOP_PIE).reduce((sum, p) => sum + p.revenue, 0);
      pieData = [
        ...top.map((p) => ({ name: p.name, value: p.revenue, percentage: p.percentage })),
        {
          name: 'Other',
          value: otherRevenue,
          percentage: productRevenueTotal > 0 ? (otherRevenue / productRevenueTotal) * 100 : 0,
        },
      ];
    }

    const totalOrders = trendOrders.length;
    const totalRevenue =
      filters.productId === 'all'
        ? trendOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
        : productSales.reduce((sum, p) => sum + p.revenue, 0);

    const summary: SalesAnalyticsSummary = {
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalUnits: productSales.reduce((sum, p) => sum + p.quantity, 0),
      manualOrders: channelFiltered.filter((o) => getOrderChannel(o) === 'manual').length,
      websiteOrders: channelFiltered.filter((o) => getOrderChannel(o) === 'website').length,
      manualRevenue: channelFiltered
        .filter((o) => getOrderChannel(o) === 'manual')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      websiteRevenue: channelFiltered
        .filter((o) => getOrderChannel(o) === 'website')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    };

    return {
      monthlyTrend,
      productSales,
      pieData,
      summary,
      filteredOrderCount: channelFiltered.length,
    };
  }, [orders, filters]);
}
