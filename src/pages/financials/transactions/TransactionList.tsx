import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowRight, Plus, Download, Filter, Search, Edit, Trash2 } from 'lucide-react';
import { useFinancials } from '@/hooks/useFinancials';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useSales } from '@/hooks/useSales';
import { useInventory } from '@/hooks/useInventory';
import { Transaction, TransactionType } from '@/types';
import { supabase } from '@/integrations/supabase/client';

const TransactionList = () => {
  const navigate = useNavigate();
  const { transactions, fetchTransactions } = useFinancials();
  const { purchaseOrders } = usePurchaseOrders();
  const { salesOrders } = useSales();
  const { adjustments } = useInventory();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Combine all different transaction types
  useEffect(() => {
    const combinedTransactions = [
      // Financial transactions
      ...transactions.map(t => ({
        ...t,
        transactionType: 'financial',
        displayType: t.type === 'income' ? 'Income' : 'Expense',
        displayId: t.id,
        date: new Date(t.date),
        description: t.description,
        amount: t.amount,
        items: null // No specific items for general transactions
      })),
      
      // Purchase Orders
      ...purchaseOrders.map(po => {
        const itemSummary = po.items.map(item => 
          `${item.name || 'Unknown'} (${item.quantity})`
        ).join(', ');
        
        return {
          id: `po-${po.id}`,
          transactionType: 'purchase',
          displayType: 'Purchase Order',
          displayId: po.orderNumber,
          date: new Date(po.createdAt),
          description: `Purchase from ${po.supplier.name}`,
          amount: po.totalAmount,
          category: 'Procurement',
          status: po.status,
          items: po.items, // Store the actual items
          itemSummary
        };
      }),
      
      // Sales Orders
      ...salesOrders.map(so => {
        const itemSummary = so.items.map(item => 
          `${item.product?.name || 'Unknown'} (${item.quantity})`
        ).join(', ');
        
        return {
          id: `so-${so.id}`,
          transactionType: 'sales',
          displayType: 'Sales Order',
          displayId: so.orderNumber,
          date: new Date(so.orderDate),
          description: `Sale to customer ${so.customer?.name || 'Walk-in Customer'}`,
          amount: so.totalAmount,
          category: 'Sales',
          status: so.status,
          items: so.items, // Store the actual items
          itemSummary
        };
      }),
      
      // Inventory Adjustments
      ...adjustments.map(adj => {
        const itemName = adj.item?.name || 'Unknown Item';
        return {
          id: `adj-${adj.id}`,
          transactionType: 'adjustment',
          displayType: 'Inventory Adjustment',
          displayId: adj.id.substring(0, 8),
          date: new Date(adj.adjustmentDate),
          description: `${adj.reason} - ${itemName} (${adj.previousQuantity} → ${adj.newQuantity})`,
          amount: 0, // No direct financial impact
          category: 'Inventory',
          reason: adj.reason,
          items: [{ product: adj.item, quantity: Math.abs(adj.newQuantity - adj.previousQuantity) }],
          itemSummary: `${itemName} (${Math.abs(adj.newQuantity - adj.previousQuantity)})`
        };
      })
    ];
    
    setAllTransactions(combinedTransactions);
  }, [transactions, purchaseOrders, salesOrders, adjustments]);

  const categories = Array.from(new Set(allTransactions.map(t => t.category || 'Uncategorized')));

  const filteredTransactions = allTransactions.filter(transaction => {
    const matchesSearch = 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.displayId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.displayType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.itemSummary && transaction.itemSummary.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || transaction.transactionType === filterType;
    const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
    
    let matchesDateRange = true;
    if (filterDateFrom) {
      matchesDateRange = matchesDateRange && transaction.date >= new Date(filterDateFrom);
    }
    if (filterDateTo) {
      matchesDateRange = matchesDateRange && transaction.date <= new Date(filterDateTo);
    }
    
    const matchesTab = currentTab === 'all' || 
                      (currentTab === 'income' && (transaction.transactionType === 'financial' && transaction.displayType === 'Income' || transaction.transactionType === 'sales')) ||
                      (currentTab === 'expense' && (transaction.transactionType === 'financial' && transaction.displayType === 'Expense' || transaction.transactionType === 'purchase'));
    
    return matchesSearch && matchesType && matchesCategory && matchesDateRange && matchesTab;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.transactionType === 'financial' && t.displayType === 'Income' || t.transactionType === 'sales')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = filteredTransactions
    .filter(t => t.transactionType === 'financial' && t.displayType === 'Expense' || t.transactionType === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);

  const getTransactionTypeColor = (type: string) => {
    switch(type) {
      case 'Income':
        return 'bg-green-100 text-green-800';
      case 'Expense':
        return 'bg-red-100 text-red-800';
      case 'Purchase Order':
        return 'bg-blue-100 text-blue-800';
      case 'Sales Order':
        return 'bg-purple-100 text-purple-800';
      case 'Inventory Adjustment':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExportToExcel = () => {
    try {
      const headers = ['Date', 'Type', 'Reference ID', 'Category', 'Description', 'Items & Quantity', 'Amount', 'Status'];
      
      const csvContent = [
        headers.join(','),
        ...filteredTransactions.map(t => [
          format(new Date(t.date), 'yyyy-MM-dd'),
          t.displayType,
          t.displayId,
          t.category || 'Uncategorized',
          `"${t.description?.replace(/"/g, '""') || ''}"`,
          `"${t.itemSummary || ''}"`,
          t.amount.toString(),
          t.status || ''
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Transactions exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error('Failed to export transactions');
    }
  };

  const resetFilters = () => {
    setFilterType('all');
    setFilterCategory('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchTerm('');
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      toast.success('Transaction deleted successfully');
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const handleEditTransaction = (transactionId: string) => {
    navigate(`/financials/transactions/${transactionId}/edit`);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
              <p className="text-muted-foreground">
                View and manage all financial transactions
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => navigate('/financials/transactions/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Transaction
              </Button>
              <Button variant="outline" onClick={handleExportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expenses</TabsTrigger>
            </TabsList>
            
            <div className="flex flex-col space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search transactions..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="sm:w-auto"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>
              
              {showFilters && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <Select
                          value={filterType}
                          onValueChange={setFilterType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="financial">Financial</SelectItem>
                            <SelectItem value="purchase">Purchase</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="adjustment">Inventory</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select
                          value={filterCategory}
                          onValueChange={setFilterCategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((category, index) => (
                              <SelectItem key={index} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">From Date</label>
                        <Input
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">To Date</label>
                        <Input
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="ml-2"
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">Rs {totalIncome.toFixed(2)}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">Rs {totalExpenses.toFixed(2)}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Rs {(totalIncome - totalExpenses).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <TabsContent value={currentTab} className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Items & Quantity</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.length > 0 ? (
                          filteredTransactions.map((transaction, index) => (
                            <TableRow key={index}>
                              <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>
                                <Badge className={getTransactionTypeColor(transaction.displayType)}>
                                  {transaction.displayType}
                                </Badge>
                              </TableCell>
                              <TableCell>{transaction.displayId}</TableCell>
                              <TableCell>{transaction.category || 'Uncategorized'}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>
                                {transaction.itemSummary || '-'}
                              </TableCell>
                              <TableCell className={`text-right font-medium ${
                                transaction.transactionType === 'financial' && transaction.displayType === 'Income' || 
                                transaction.transactionType === 'sales' ? 'text-green-600' : 
                                transaction.transactionType === 'financial' && transaction.displayType === 'Expense' || 
                                transaction.transactionType === 'purchase' ? 'text-red-600' : ''
                              }`}>
                                {transaction.amount ? 
                                  (transaction.transactionType === 'financial' && transaction.displayType === 'Income' || 
                                  transaction.transactionType === 'sales' ? '+' : 
                                  transaction.transactionType === 'financial' && transaction.displayType === 'Expense' || 
                                  transaction.transactionType === 'purchase' ? '-' : '') + 
                                  'Rs ' + transaction.amount.toFixed(2) : 
                                  '-'}
                              </TableCell>
                              <TableCell>
                                {transaction.status ? (
                                  <Badge variant="outline">
                                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                  </Badge>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {transaction.transactionType === 'financial' && (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditTransaction(transaction.id)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteTransaction(transaction.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                              No transactions found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default TransactionList;
