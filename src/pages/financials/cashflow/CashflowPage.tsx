
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  category: string;
  date: string;
}

// Build a list of the last 24 months + "all" option
const buildMonthOptions = () => {
  const opts: { value: string; label: string }[] = [{ value: 'all', label: 'All Time' }];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = subMonths(now, i);
    opts.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy'),
    });
  }
  return opts;
};

const MONTH_OPTIONS = buildMonthOptions();

const CashflowPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const period = useMemo(() => {
    if (selectedMonth === 'all') return null;
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return { start: startOfMonth(d), end: endOfMonth(d) };
  }, [selectedMonth]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        let query = supabase
          .from('financial_transactions')
          .select('*')
          .order('date', { ascending: true });

        if (period) {
          query = query
            .gte('date', period.start.toISOString())
            .lte('date', period.end.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to load cashflow data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [period]);

  const totalIncome = transactions
    .filter(t => t.type.toLowerCase() === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const totalExpenses = transactions
    .filter(t => t.type.toLowerCase() === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const netCashflow = totalIncome - totalExpenses;

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    const grouped = transactions.reduce((acc, t) => {
      const date = t.date.split('T')[0];
      if (!acc[date]) acc[date] = { income: 0, expense: 0 };
      if (t.type.toLowerCase() === 'income') acc[date].income += parseFloat(t.amount.toString());
      else acc[date].expense += parseFloat(t.amount.toString());
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    return Object.entries(grouped)
      .map(([date, v]) => ({
        date: format(new Date(date), 'MMM dd'),
        income: v.income,
        expense: v.expense,
        net: v.income - v.expense,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  const periodLabel = period
    ? `${format(period.start, 'MMM d, yyyy')} – ${format(period.end, 'MMM d, yyyy')}`
    : 'All Time';

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/financials')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Cashflow</h1>
              <p className="text-muted-foreground">Track your income and expenses over time</p>
            </div>
          </div>

          {/* Month selector */}
          <div className="flex justify-end">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Rs {totalIncome.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">Rs {totalExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Cashflow</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rs {netCashflow.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cashflow Trend — {periodLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[400px]">Loading chart data…</div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`Rs ${value}`, '']} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" />
                    <Bar dataKey="net" name="Net" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-[400px] text-muted-foreground">
                  No transaction data available for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction table */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">Loading transactions…</TableCell>
                    </TableRow>
                  ) : transactions.length > 0 ? (
                    transactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/50">
                        <TableCell>{format(new Date(t.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>{t.type.charAt(0).toUpperCase() + t.type.slice(1)}</TableCell>
                        <TableCell className={`text-right font-medium ${t.type.toLowerCase() === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type.toLowerCase() === 'income' ? '+' : '-'}Rs {parseFloat(t.amount.toString()).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No transactions found for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CashflowPage;
