
import { useState, useCallback } from 'react';
import { Transaction, TransactionType, PaymentMethod, ReportFilter, FinancialReport } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useFinancials = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all transactions from Supabase
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      const sourceOrderIds = [...new Set((data || []).map((t: any) => t.source_order_id).filter(Boolean))];
      let orderImagesMap: Record<string, string[]> = {};
      if (sourceOrderIds.length > 0) {
        const { data: orderImagesData } = await supabase
          .from('order_images')
          .select('order_id, image_url')
          .in('order_id', sourceOrderIds)
          .order('sort_order', { ascending: true });
        (orderImagesData || []).forEach((row: any) => {
          if (!orderImagesMap[row.order_id]) orderImagesMap[row.order_id] = [];
          orderImagesMap[row.order_id].push(row.image_url);
        });
      }

      const poRefs = [...new Set((data || []).filter((t: any) => t.category === 'purchases' && t.reference_number).map((t: any) => t.reference_number))];
      let poImagesMap: Record<string, string[]> = {};
      if (poRefs.length > 0) {
        try {
          const { data: poData } = await supabase.from('purchase_orders').select('id, order_number').in('order_number', poRefs);
          const poIds = (poData || []).map((p: any) => p.id);
          if (poIds.length > 0) {
            const { data: poImagesData } = await (supabase as any).from('purchase_order_images').select('purchase_order_id, image_url').in('purchase_order_id', poIds).order('sort_order', { ascending: true });
            const poById = new Map((poData || []).map((p: any) => [p.id, p]));
            (poImagesData || []).forEach((row: any) => {
              const po = poById.get(row.purchase_order_id);
              if (po?.order_number) {
                if (!poImagesMap[po.order_number]) poImagesMap[po.order_number] = [];
                poImagesMap[po.order_number].push(row.image_url);
              }
            });
          }
        } catch (_) {}
      }

      const formattedTransactions: Transaction[] = (data || []).map((transaction: any) => {
        const billImages = transaction.bill_images && Array.isArray(transaction.bill_images) ? transaction.bill_images : null;
        const orderImages = transaction.source_order_id ? (orderImagesMap[transaction.source_order_id] || []) : [];
        const poImages = transaction.category === 'purchases' && transaction.reference_number ? (poImagesMap[transaction.reference_number] || []) : [];
        const allImages = [...(billImages || []), ...orderImages, ...poImages];
        return {
          id: transaction.id,
          type: transaction.type as TransactionType,
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description || '',
          date: new Date(transaction.date),
          paymentMethod: transaction.payment_method as PaymentMethod,
          referenceNumber: transaction.reference_number || '',
          createdAt: new Date(transaction.created_at),
          bill_images: allImages.length > 0 ? allImages : null,
          source_order_id: transaction.source_order_id || null
        };
      });

      setTransactions(formattedTransactions);
      console.log('Transactions loaded from database:', formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a new transaction to Supabase - supports both object and individual params
  const addTransaction = async (
    typeOrObject: TransactionType | { 
      type: TransactionType, 
      amount: number, 
      category: string, 
      description: string, 
      date: Date, 
      paymentMethod: PaymentMethod,
      referenceNumber?: string 
    },
    amount?: number,
    category?: string,
    description?: string,
    date?: Date,
    paymentMethod?: PaymentMethod,
    referenceNumber?: string
  ) => {
    try {
      let transactionData: any;
      
      if (typeof typeOrObject === 'object') {
        // Object parameter style
        transactionData = {
          type: typeOrObject.type,
          amount: typeOrObject.amount,
          category: typeOrObject.category,
          description: typeOrObject.description,
          date: typeOrObject.date.toISOString(),
          payment_method: typeOrObject.paymentMethod,
          reference_number: typeOrObject.referenceNumber
        };
      } else {
        // Individual parameters style
        transactionData = {
          type: typeOrObject,
          amount,
          category,
          description,
          date: date?.toISOString(),
          payment_method: paymentMethod,
          reference_number: referenceNumber
        };
      }

      const amt = transactionData.amount;
      if (amt == null || amt <= 0) {
        throw new Error('Amount must be greater than zero');
      }

      const { data, error } = await supabase
        .from('financial_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newTransaction: Transaction = {
        id: data.id,
        type: data.type as TransactionType,
        amount: data.amount,
        category: data.category,
        description: data.description || '',
        date: new Date(data.date),
        paymentMethod: data.payment_method as PaymentMethod,
        referenceNumber: data.reference_number || '',
        createdAt: new Date(data.created_at)
      };

      setTransactions(prev => [newTransaction, ...prev]);
      toast.success('Transaction added successfully');
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
      throw error;
    }
  };

  // Generate a financial report
  const generateFinancialReport = async (filter: ReportFilter): Promise<FinancialReport[]> => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .gte('date', filter.startDate.toISOString())
        .lte('date', filter.endDate.toISOString());
        
      if (filter.category) {
        query = query.eq('category', filter.category);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      const report: FinancialReport[] = data.map(item => ({
        id: item.id,
        date: new Date(item.date),
        type: item.type as TransactionType,
        category: item.category,
        amount: item.amount,
        description: item.description || ''
      }));
      
      return report;
    } catch (error) {
      console.error('Error generating financial report:', error);
      toast.error('Failed to generate financial report');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get financial summary
  const getFinancialSummary = (startDate: Date, endDate: Date) => {
    const filteredTransactions = transactions.filter(
      t => t.date >= startDate && t.date <= endDate
    );
    
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    return {
      income,
      expenses,
      balance: income - expenses,
      transactionCount: filteredTransactions.length
    };
  };

  return {
    transactions,
    isLoading,
    fetchTransactions,
    addTransaction,
    generateFinancialReport,
    getFinancialSummary,
    getTransactionById: (id: string) => transactions.find(t => t.id === id)
  };
};
