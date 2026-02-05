import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, History, Search, Filter, Loader2, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  variant_name: string | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  // Joined data
  item_name?: string;
  item_category?: string;
}

const InventoryTransactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, typeFilter]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          inventory_items (
            name,
            item_category
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTransactions = data.map(t => ({
        ...t,
        item_name: (t.inventory_items as any)?.name || 'Unknown Item',
        item_category: (t.inventory_items as any)?.item_category || 'Unknown'
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load inventory transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.transaction_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === typeFilter);
    }

    setFilteredTransactions(filtered);
  };

  const getTransactionTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      craft_completed: {
        label: 'Craft Completed',
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
        icon: <TrendingUp className="h-3 w-3 mr-1" />
      },
      manufacturing_used: {
        label: 'Manufacturing',
        className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
        icon: <TrendingDown className="h-3 w-3 mr-1" />
      },
      sales_order: {
        label: 'Sales Order',
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
        icon: <ArrowDownCircle className="h-3 w-3 mr-1" />
      },
      purchase_order: {
        label: 'Purchase Order',
        className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
        icon: <ArrowUpCircle className="h-3 w-3 mr-1" />
      },
      adjustment: {
        label: 'Adjustment',
        className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
        icon: null
      },
      manual: {
        label: 'Manual',
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        icon: null
      }
    };

    const badge = badges[type] || { label: type, className: 'bg-gray-100 text-gray-800', icon: null };

    return (
      <Badge variant="outline" className={badge.className}>
        {badge.icon}
        {badge.label}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/inventory')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Inventory Transactions</h1>
              <p className="text-muted-foreground">
                Track all inventory movements and stock changes
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
                <Badge variant="secondary" className="ml-2">
                  {filteredTransactions.length} records
                </Badge>
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="craft_completed">Craft Completed</SelectItem>
                    <SelectItem value="manufacturing_used">Manufacturing</SelectItem>
                    <SelectItem value="sales_order">Sales Orders</SelectItem>
                    <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                    <SelectItem value="adjustment">Adjustments</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Loading transactions...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || typeFilter !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Inventory transactions will appear here'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-center">Change</TableHead>
                      <TableHead className="text-center">Before</TableHead>
                      <TableHead className="text-center">After</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(transaction.created_at), 'HH:mm:ss')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{transaction.item_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {transaction.item_category}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTransactionTypeBadge(transaction.transaction_type)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transaction.variant_name || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${
                            transaction.quantity_change > 0 
                              ? 'text-green-600' 
                              : 'text-orange-600'
                          }`}>
                            {transaction.quantity_change > 0 ? '+' : ''}
                            {transaction.quantity_change}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {transaction.quantity_before}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {transaction.quantity_after}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-muted-foreground truncate" title={transaction.notes || ''}>
                            {transaction.notes || '-'}
                          </p>
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

export default InventoryTransactions;
