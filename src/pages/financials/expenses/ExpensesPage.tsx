import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, TooltipProps } from 'recharts';
import { useFinancials } from '@/hooks/useFinancials';
import { ValueType } from '@/types';
import { format } from 'date-fns';

interface ExpenseData {
  category: string;
  amount: number;
}

const ExpensesPage = () => {
  const navigate = useNavigate();
  const { transactions, fetchTransactions, isLoading } = useFinancials();
  const [selectedTimeframe, setSelectedTimeframe] = useState('this_month');
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!isLoading) {
      const now = new Date();
      let startDate: Date;

      switch (selectedTimeframe) {
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'last_year':
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const endDate = new Date();

      const filteredExpenses = transactions.filter(
        transaction =>
          transaction.type === 'expense' &&
          transaction.date >= startDate &&
          transaction.date <= endDate
      );

      const categoryAmounts = filteredExpenses.reduce((acc: { [key: string]: number }, transaction) => {
        const category = transaction.category;
        acc[category] = (acc[category] || 0) + transaction.amount;
        return acc;
      }, {});

      const chartData = Object.keys(categoryAmounts).map(category => ({
        category: category,
        amount: categoryAmounts[category]
      }));

      setExpenseData(chartData);
    }
  }, [transactions, isLoading, selectedTimeframe]);

  const totalExpenses = expenseData.reduce((sum, data) => sum + data.amount, 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Format currency correctly for different value types
  const formatCurrency = (value: ValueType) => {
    if (typeof value === 'number') {
      return `Rs ${value.toFixed(2)}`;
    }
    return value;
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/financials')} className="h-8 w-8">
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
              <p className="text-muted-foreground">Overview of expenses</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Expenses Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                <div className="w-full md:w-auto">
                  <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="last_year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-lg font-semibold">Total Expenses: {formatCurrency(totalExpenses)}</div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={160}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value: ValueType) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2">Expenses by Category</h3>
                <ul className="list-disc pl-5">
                  {expenseData.map((data, index) => (
                    <li key={index}>
                      {data.category}: {formatCurrency(data.amount)}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ExpensesPage;
