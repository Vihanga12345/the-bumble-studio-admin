
import { useState, useCallback, useEffect } from 'react';
import { Customer, SalesOrder, Invoice, SaleItem, PaymentMethod, SalesOrderStatus, InventoryItem, UnitOfMeasure, InvoiceStatus } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateSalesOrderParams {
  customerId?: string;
  items: {
    itemId: string;
    quantity: number;
    unitPrice: number;
  }[];
  paymentMethod: PaymentMethod;
  status: SalesOrderStatus;
  notes: string;
  orderSource?: string;
}

export const useSales = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      const formattedCustomers: Customer[] = data.map(customer => ({
        id: customer.id,
        name: customer.name,
        telephone: customer.telephone || '',
        address: customer.address || '',
        email: customer.email || '',
        createdAt: new Date(customer.created_at)
      }));

      setCustomers(formattedCustomers);
      console.log('Customers loaded from database:', formattedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSalesOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('*');

      if (itemsError) {
        throw itemsError;
      }

      const itemIds = Array.from(new Set(
        (itemsData || [])
          .map(item => item.item_id || item.inventory_item_id || item.product_id)
          .filter(Boolean)
      ));

      let inventoryMap: Record<string, any> = {};
      if (itemIds.length > 0) {
        const { data: inventoryItems, error: inventoryError } = await supabase
          .from('inventory_items')
          .select('*')
          .in('id', itemIds);

        if (inventoryError) {
          throw inventoryError;
        }

        (inventoryItems || []).forEach(item => {
          inventoryMap[item.id] = item;
        });
      }

      const formattedOrders: SalesOrder[] = ordersData.map(order => {
        const orderItems = itemsData
          .filter(item => item.sales_order_id === order.id)
          .map(item => {
            const itemId = item.item_id || item.inventory_item_id || item.product_id;
            const productRow = inventoryMap[itemId];
            const product: InventoryItem = productRow ? {
              id: productRow.id,
              name: productRow.name,
              description: productRow.description || '',
              category: productRow.category || '',
              unitOfMeasure: productRow.unit_of_measure as UnitOfMeasure,
              purchaseCost: productRow.purchase_cost,
              sellingPrice: productRow.selling_price,
              currentStock: productRow.current_stock,
              reorderLevel: productRow.reorder_level,
              sku: productRow.sku || '',
              isActive: productRow.is_active,
              createdAt: new Date(productRow.created_at),
              updatedAt: new Date(productRow.updated_at)
            } : {
              id: itemId,
              name: item.item_name || 'Unknown Item',
              description: '',
              category: '',
              unitOfMeasure: 'pieces' as UnitOfMeasure,
              purchaseCost: 0,
              sellingPrice: 0,
              currentStock: 0,
              reorderLevel: 0,
              sku: '',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const saleItem: SaleItem = {
              id: item.id,
              productId: itemId,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              discount: item.discount,
              totalPrice: item.total_price,
              product
            };

            return saleItem;
          });

        const customer: Customer = order.customer ? {
          id: order.customer.id,
          name: order.customer.name,
          telephone: order.customer.telephone || '',
          address: order.customer.address || '',
          email: order.customer.email || '',
          createdAt: new Date(order.customer.created_at)
        } : {
          id: '',
          name: 'Walk-in Customer',
          telephone: '',
          address: '',
          email: '',
          createdAt: new Date()
        };

        return {
          id: order.id,
          customerId: order.customer_id,
          customer,
          orderNumber: order.order_number,
          items: orderItems,
          status: order.status as SalesOrderStatus,
          orderDate: new Date(order.order_date),
          totalAmount: order.total_amount,
          advancePaymentAmount: order.advance_payment_amount ? Number(order.advance_payment_amount) : undefined,
          remainingBalance: order.remaining_balance ? Number(order.remaining_balance) : undefined,
          paymentMethod: order.payment_method as PaymentMethod,
          notes: order.notes || '',
          createdAt: new Date(order.created_at),
          updatedAt: new Date(order.updated_at),
          orderSource: order.order_source || undefined,
          customerName: order.customer_name || customer?.name,
          customerEmail: order.customer_email || customer?.email,
          customerPhone: order.customer_phone || customer?.telephone,
          shippingAddress: order.shipping_address || customer?.address,
          shippingCity: order.shipping_city || undefined,
          shippingPostalCode: order.shipping_postal_code || undefined,
          deliveryInstructions: order.delivery_instructions || undefined
        };
      });

      setSalesOrders(formattedOrders);
      console.log('Sales orders loaded from database:', formattedOrders);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      toast.error('Failed to load sales orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedInvoices: Invoice[] = data.map(invoice => ({
        id: invoice.id,
        salesOrderId: invoice.sales_order_id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        status: invoice.status as InvoiceStatus,
        createdAt: new Date(invoice.created_at),
        paidAt: invoice.paid_at ? new Date(invoice.paid_at) : undefined
      }));

      setInvoices(formattedInvoices);
      console.log('Invoices loaded from database:', formattedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSalesData = useCallback(async () => {
    await Promise.all([
      fetchCustomers(),
      fetchSalesOrders(),
      fetchInvoices()
    ]);
  }, [fetchCustomers, fetchSalesOrders, fetchInvoices]);

  useEffect(() => {
    refreshSalesData();
  }, [refreshSalesData]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: customer.name,
          telephone: customer.telephone,
          address: customer.address,
          email: customer.email
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newCustomer: Customer = {
        id: data.id,
        name: data.name,
        telephone: data.telephone || '',
        address: data.address || '',
        email: data.email || '',
        createdAt: new Date(data.created_at)
      };

      setCustomers(prev => [...prev, newCustomer]);
      
      await fetchCustomers();
      
      toast.success('Customer added successfully');
      return newCustomer;
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
      throw error;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: updates.name,
          telephone: updates.telephone,
          address: updates.address,
          email: updates.email
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      setCustomers(prev =>
        prev.map(customer => (customer.id === id ? { ...customer, ...updates } : customer))
      );
      
      await fetchCustomers();
      
      toast.success('Customer updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setCustomers(prev => prev.filter(customer => customer.id !== id));
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
      throw error;
    }
  };

  const generateUniqueOrderNumber = async () => {
    let attempts = 0;
    while (attempts < 10) {
      const candidate = `${Math.floor(10000000 + Math.random() * 90000000)}`;
      const { count, error } = await supabase
        .from('sales_orders')
        .select('id', { count: 'exact', head: true })
        .eq('order_number', candidate);

      if (!error && (count || 0) === 0) {
        return candidate;
      }
      attempts += 1;
    }
    throw new Error('Failed to generate a unique order number');
  };

  const addSalesOrder = async (orderData: CreateSalesOrderParams) => {
    try {
      const orderNumber = await generateUniqueOrderNumber();

      const totalAmount = orderData.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      // Handle customer ID properly - null for walk-in or empty customers
      const customerIdValue = !orderData.customerId || 
                            orderData.customerId === 'walk-in' || 
                            orderData.customerId === '' 
        ? null 
        : orderData.customerId;

      console.log('Creating sales order with customer ID:', customerIdValue);

      const { data, error } = await supabase
        .from('sales_orders')
        .insert({
          customer_id: customerIdValue,
          order_number: orderNumber,
          total_amount: totalAmount,
          status: orderData.status,
          payment_method: orderData.paymentMethod,
          notes: orderData.notes,
          order_source: orderData.orderSource || 'manual'
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating sales order:', error);
        throw error;
      }

      console.log('Sales order created in DB:', data);

      const orderItems = await Promise.all(
        orderData.items.map(async item => {
          const { data: itemData, error: itemError } = await supabase
            .from('sales_order_items')
            .insert({
              sales_order_id: data.id,
              product_id: item.itemId,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              discount: 0,
              total_price: item.quantity * item.unitPrice
            })
            .select()
            .single();

          if (itemError) {
            throw itemError;
          }

          return itemData;
        })
      );

      console.log('Sales order items created:', orderItems);

      let customerObj;
      if (data.customer_id) {
        const customer = customers.find(c => c.id === data.customer_id);
        customerObj = customer;
      }

      const newOrder: SalesOrder = {
        id: data.id,
        customerId: data.customer_id,
        customer: customerObj,
        orderNumber: data.order_number,
        status: data.status as SalesOrderStatus,
        orderDate: new Date(data.order_date),
        totalAmount: data.total_amount,
        paymentMethod: data.payment_method as PaymentMethod,
        notes: data.notes || '',
        items: [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      if (newOrder.status === 'completed') {
        await createInvoiceForOrder(newOrder.id);
      }

      setSalesOrders(prev => [newOrder, ...prev]);
      
      await fetchSalesOrders();
      
      toast.success('Sales order created successfully');
      return newOrder;
    } catch (error) {
      console.error('Error creating sales order:', error);
      toast.error(`Error creating sales order: ${(error as Error).message}`);
      throw error;
    }
  };

  const updateSalesOrder = async (id: string, updates: Partial<SalesOrder>) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({
          status: updates.status,
          payment_method: updates.paymentMethod,
          notes: updates.notes
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      setSalesOrders(prev =>
        prev.map(order => (order.id === id ? { ...order, ...updates } : order))
      );
      
      await fetchSalesOrders();
      
      toast.success('Sales order updated successfully');
    } catch (error) {
      console.error('Error updating sales order:', error);
      toast.error('Failed to update sales order');
      throw error;
    }
  };

  const generateInvoice = async (salesOrderId: string) => {
    try {
      const order = salesOrders.find(o => o.id === salesOrderId);
      if (!order) {
        toast.error('Sales order not found');
        return;
      }

      return await createInvoiceForOrder(salesOrderId);
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
      throw error;
    }
  };

  const createInvoiceForOrder = async (salesOrderId: string) => {
    try {
      const order = salesOrders.find(order => order.id === salesOrderId);
      
      if (!order) {
        toast.error('Sales order not found');
        return;
      }
      
      const today = new Date();
      const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${yearMonth}${randomNum}`;
      
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          sales_order_id: salesOrderId,
          invoice_number: invoiceNumber,
          amount: order.totalAmount,
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      const newInvoice: Invoice = {
        id: data.id,
        salesOrderId: data.sales_order_id,
        invoiceNumber: data.invoice_number,
        amount: data.amount,
        status: data.status as InvoiceStatus,
        createdAt: new Date(data.created_at),
        paidAt: data.paid_at ? new Date(data.paid_at) : undefined
      };
      
      setInvoices(prev => [newInvoice, ...prev]);
      
      await fetchInvoices();
      
      toast.success('Invoice created successfully');
      return newInvoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
      throw error;
    }
  };

  const updateInvoiceStatus = async (id: string, status: InvoiceStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status,
          paid_at: status === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      setInvoices(prev =>
        prev.map(invoice => 
          invoice.id === id 
            ? { 
                ...invoice, 
                status, 
                paidAt: status === 'paid' ? new Date() : invoice.paidAt 
              } 
            : invoice
        )
      );
      
      await fetchInvoices();
      
      toast.success('Invoice updated successfully');
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
      throw error;
    }
  };

  // Add PDF export functionality
  const exportSalesOrderToPdf = async (id: string) => {
    try {
      const order = salesOrders.find(order => order.id === id);
      if (!order) {
        throw new Error('Sales order not found');
      }
      
      // Use the new PDF generator
      const { generateSalesOrderPDF } = await import('@/lib/pdfGenerator');
      await generateSalesOrderPDF(order);
      
      toast.success('Sales order exported to PDF successfully');
      return true;
    } catch (error) {
      console.error('Error exporting sales order to PDF:', error);
      toast.error(`Failed to export sales order: ${(error as Error).message}`);
      throw error;
    }
  };

  return {
    customers,
    salesOrders,
    invoices,
    isLoading,
    fetchCustomers,
    fetchSalesOrders,
    fetchInvoices,
    refreshSalesData,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSalesOrder,
    updateSalesOrder,
    generateInvoice,
    createInvoiceForOrder,
    updateInvoiceStatus,
    exportSalesOrderToPdf,
    getCustomerById: (id: string) => customers.find(customer => customer.id === id),
    getSalesOrderById: (id: string) => salesOrders.find(order => order.id === id),
    getInvoiceById: (id: string) => invoices.find(invoice => invoice.id === id)
  };
};
