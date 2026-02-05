
import React, { useState, useEffect } from 'react';
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

const CashflowPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timeframe, setTimeframe] = useState('month');
  
  const [period, setPeriod] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        
        let startDate, endDate;
        
        if (timeframe === 'month') {
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
        } else if (timeframe === 'quarter') {
          startDate = startOfMonth(subMonths(new Date(), 2));
          endDate = endOfMonth(new Date());
        } else if (timeframe === 'year') {
          startDate = startOfMonth(subMonths(new Date(), 11));
          endDate = endOfMonth(new Date());
        }
        
        setPeriod({ start: startDate!, end: endDate! });
        
        const { data, error } = await supabase
          .from('financial_transactions')
          .select('*')
          .gte('date', startDate!.toISOString())
          .lte('date', endDate!.toISOString())
          .order('date', { ascending: true });

        if (error) {
          throw error;
        }

        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to load cashflow data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [timeframe]);

  const totalIncome = transactions
    .filter(t => t.type.toLowerCase() === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
  const totalExpenses = transactions
    .filter(t => t.type.toLowerCase() === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
  const netCashflow = totalIncome - totalExpenses;

  // Prepare data for chart
  const prepareChartData = () => {
    const chartData: any[] = [];
    
    if (transactions.length === 0) return chartData;
    
    // Group by date (simplified for this example)
    const groupedByDate = transactions.reduce((acc, transaction) => {
      const date = transaction.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = { income: 0, expense: 0 };
      }
      
      if (transaction.type.toLowerCase() === 'income') {
        acc[date].income += parseFloat(transaction.amount.toString());
      } else {
        acc[date].expense += parseFloat(transaction.amount.toString());
      }
      
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);
    
    // Convert to array format for chart
    Object.entries(groupedByDate).forEach(([date, values]) => {
      chartData.push({
        date: format(new Date(date), 'MMM dd'),
        income: values.income,
        expense: values.expense,
        net: values.income - values.expense
      });
    });
    
    return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const chartData = prepareChartData();

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/financials')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Cashflow</h1>
              <p className="text-muted-foreground">Track your income and expenses over time</p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Rs {totalIncome.toFixed(2)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">Rs {totalExpenses.toFixed(2)}</div>
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
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Cashflow Trend: {format(period.start, 'MMM d, yyyy')} - {format(period.end, 'MMM d, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[400px]">
                  Loading chart data...
                </div>
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
                      <TableCell colSpan={4} className="text-center py-8">
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-muted/50">
                        <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell>{transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</TableCell>
                        <TableCell className={`text-right font-medium ${transaction.type.toLowerCase() === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type.toLowerCase() === 'income' ? '+' : '-'}Rs {parseFloat(transaction.amount.toString()).toFixed(2)}
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
