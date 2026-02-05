// E-commerce to ERP Order Sync API
// This module handles synchronization of orders from the e-commerce website to the ERP system

import { supabase } from '@/integrations/supabase/client';

// Constants
const E_COMMERCE_BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

export interface EcommerceOrderData {
  orderId: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  orderDate: string;
  notes?: string;
}

export interface OrderSyncResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

export interface WebsiteOrder {
  id: string;
  order_number: string;
  status: string;
  order_date: string;
  total_amount: number;
  payment_method: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  customer_email: string;
  customer_phone: string;
  delivery_instructions: string;
  customer_name: string;
  user_email: string;
  customer_record_name: string;
  order_items: any[];
  created_at: string;
  updated_at: string;
}

export class OrderSyncAPI {
  /**
   * Process incoming order from e-commerce site
   */
  static async processEcommerceOrder(orderData: EcommerceOrderData): Promise<OrderSyncResponse> {
    try {
      console.log('Processing e-commerce order:', orderData.orderId);

      // Validate required fields
      if (!orderData.orderId || !orderData.customerInfo || !orderData.items || orderData.items.length === 0) {
        return {
          success: false,
          error: 'Missing required order data'
        };
      }

      // 1. Create or find customer
      const customerResult = await this.createOrFindCustomer(orderData.customerInfo);
      if (!customerResult.success) {
        return {
          success: false,
          error: `Failed to create customer: ${customerResult.error}`
        };
      }

      // 2. Create or find inventory items for the products
      const inventoryResult = await this.createOrFindInventoryItems(orderData.items);
      if (!inventoryResult.success) {
        return {
          success: false,
          error: `Failed to process inventory items: ${inventoryResult.error}`
        };
      }

      // 3. Generate ERP order number
      const orderNumber = await this.generateOrderNumber();

      // 4. Create sales order
      const orderResult = await this.createSalesOrder({
        orderNumber,
        customerId: customerResult.customerId!,
        orderData,
        inventoryItems: inventoryResult.inventoryItems!
      });

      if (!orderResult.success) {
        return {
          success: false,
          error: `Failed to create sales order: ${orderResult.error}`
        };
      }

      console.log('Order sync completed successfully:', {
        ecommerceOrderId: orderData.orderId,
        erpOrderId: orderResult.orderId,
        erpOrderNumber: orderNumber
      });

      return {
        success: true,
        orderId: orderResult.orderId,
        orderNumber: orderNumber
      };

    } catch (error) {
      console.error('Error syncing order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create or find customer in ERP system
   */
  private static async createOrFindCustomer(customerInfo: EcommerceOrderData['customerInfo']): Promise<{
    success: boolean;
    customerId?: string;
    error?: string;
  }> {
    try {
      // Check if customer already exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerInfo.email)
        .eq('business_id', E_COMMERCE_BUSINESS_ID)
        .single();

      if (existingCustomer) {
        return {
          success: true,
          customerId: existingCustomer.id
        };
      }

      // Create new customer
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          name: `${customerInfo.firstName} ${customerInfo.lastName}`,
          telephone: customerInfo.phone,
          address: `${customerInfo.address}, ${customerInfo.city}, ${customerInfo.state} ${customerInfo.postalCode}, ${customerInfo.country}`,
          email: customerInfo.email,
          business_id: E_COMMERCE_BUSINESS_ID,
          source: 'website',
          registered_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        customerId: newCustomer.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in customer creation'
      };
    }
  }

  /**
   * Create or find inventory items for website products
   */
  private static async createOrFindInventoryItems(items: EcommerceOrderData['items']): Promise<{
    success: boolean;
    inventoryItems?: Array<{ id: string; sku: string; name: string }>;
    error?: string;
  }> {
    try {
      const inventoryItems: Array<{ id: string; sku: string; name: string }> = [];

      for (const item of items) {
        const sku = item.sku || item.productId;

        // Check if inventory item already exists
        const { data: existingItem } = await supabase
          .from('inventory_items')
          .select('id, sku, name')
          .eq('sku', sku)
          .eq('business_id', E_COMMERCE_BUSINESS_ID)
          .single();

        if (existingItem) {
          inventoryItems.push(existingItem);
          continue;
        }

        // Create new inventory item
        const { data: newItem, error } = await supabase
          .from('inventory_items')
          .insert({
            name: item.productName,
            description: `Website product: ${item.productName}`,
            category: 'Website Products',
            unit_of_measure: 'units',
            purchase_cost: item.unitPrice * 0.7, // Assume 30% markup
            selling_price: item.unitPrice,
            current_stock: 1000, // Default stock for website products
            reorder_level: 10,
            sku: sku,
            is_active: true,
            is_website_item: true,
            business_id: E_COMMERCE_BUSINESS_ID
          })
          .select('id, sku, name')
          .single();

        if (error) {
          return {
            success: false,
            error: `Failed to create inventory item for ${item.productName}: ${error.message}`
          };
        }

        inventoryItems.push(newItem);
      }

      return {
        success: true,
        inventoryItems
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in inventory creation'
      };
    }
  }

  /**
   * Create sales order and order items
   */
  private static async createSalesOrder(params: {
    orderNumber: string;
    customerId: string;
    orderData: EcommerceOrderData;
    inventoryItems: Array<{ id: string; sku: string; name: string }>;
  }): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
  }> {
    try {
      const { orderNumber, customerId, orderData, inventoryItems } = params;

      // Create sales order
      const { data: salesOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          order_date: orderData.orderDate,
          total_amount: orderData.totalAmount,
          status: 'pending',
          payment_method: orderData.paymentMethod,
          notes: orderData.notes || 'Website Order',
          business_id: E_COMMERCE_BUSINESS_ID,
          order_source: 'website',
          shipping_address: orderData.customerInfo.address,
          shipping_city: orderData.customerInfo.city,
          shipping_postal_code: orderData.customerInfo.postalCode,
          customer_email: orderData.customerInfo.email,
          customer_phone: orderData.customerInfo.phone
        })
        .select('id')
        .single();

      if (orderError) {
        return {
          success: false,
          error: orderError.message
        };
      }

      // Create sales order items
      const orderItems = orderData.items.map((item) => {
        const inventoryItem = inventoryItems.find(inv => inv.sku === (item.sku || item.productId));
        
        if (!inventoryItem) {
          throw new Error(`Inventory item not found for SKU: ${item.sku || item.productId}`);
        }

        return {
          sales_order_id: salesOrder.id,
          product_id: inventoryItem.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          discount: 0
        };
      });

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems);

      if (itemsError) {
        // Clean up - delete the sales order if items creation failed
        await supabase
          .from('sales_orders')
          .delete()
          .eq('id', salesOrder.id);

        return {
          success: false,
          error: `Failed to create order items: ${itemsError.message}`
        };
      }

      // Create order status history
      await supabase
        .from('sales_order_status_history')
        .insert({
          sales_order_id: salesOrder.id,
          new_status: 'pending',
          reason: 'Initial order placement from website'
        });

      return {
        success: true,
        orderId: salesOrder.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in sales order creation'
      };
    }
  }

  /**
   * Generate sequential order number for website orders
   */
  private static async generateOrderNumber(): Promise<string> {
    try {
      // Get the last order number for today
      const today = new Date().toISOString().split('T')[0];
      
      const { data: lastOrder } = await supabase
        .from('sales_orders')
        .select('order_number')
        .eq('business_id', E_COMMERCE_BUSINESS_ID)
        .like('order_number', 'WEB%')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastOrder?.order_number) {
        const match = lastOrder.order_number.match(/WEB(\d{8})(\d{3})$/);
        if (match) {
          nextNumber = parseInt(match[2]) + 1;
        }
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `WEB${dateStr}${nextNumber.toString().padStart(3, '0')}`;

    } catch (error) {
      // If there's an error, just use timestamp-based number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `WEB${dateStr}001`;
    }
  }

  /**
   * Get all website orders using the new view
   */
  static async getWebsiteOrders(): Promise<WebsiteOrder[]> {
    try {
      const { data: orders, error } = await supabase
        .from('website_orders_for_erp')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching website orders:', error);
        
        // Fallback: Query sales_orders directly
        const { data: fallbackOrders, error: fallbackError } = await supabase
          .from('sales_orders')
          .select(`
            id,
            order_number,
            status,
            order_date,
            total_amount,
            payment_method,
            shipping_address,
            shipping_city,
            shipping_postal_code,
            customer_email,
            customer_phone,
            delivery_instructions,
            created_at,
            updated_at,
            customers!inner(name, email),
            website_users(first_name, last_name, email)
          `)
          .eq('order_source', 'website')
          .eq('business_id', E_COMMERCE_BUSINESS_ID)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }

        // Transform fallback data to match expected format
        return (fallbackOrders || []).map(order => ({
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          order_date: order.order_date,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          shipping_address: order.shipping_address || '',
          shipping_city: order.shipping_city || '',
          shipping_postal_code: order.shipping_postal_code || '',
          customer_email: order.customer_email || '',
          customer_phone: order.customer_phone || '',
          delivery_instructions: order.delivery_instructions || '',
          customer_name: order.customers?.name || 'Unknown Customer',
          user_email: order.website_users?.email || order.customer_email || '',
          customer_record_name: order.customers?.name || 'Unknown Customer',
          order_items: [],
          created_at: order.created_at,
          updated_at: order.updated_at
        }));
      }

      return orders || [];
    } catch (error) {
      console.error('Error in getWebsiteOrders:', error);
      return [];
    }
  }

  /**
   * Update order status with proper status mapping
   */
  static async updateOrderStatus(orderId: string, newStatus: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Map UI status to database status
      const statusMapping: { [key: string]: string } = {
        'Order Confirmed': 'confirmed',
        'Order Pending Delivery': 'shipped',
        'Order Delivered': 'delivered',
        'Ship': 'shipped',
        'Deliver': 'delivered'
      };

      const dbStatus = statusMapping[newStatus] || newStatus.toLowerCase();

      // Update the order status
      const { error: updateError } = await supabase
        .from('sales_orders')
        .update({ 
          status: dbStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('business_id', E_COMMERCE_BUSINESS_ID);

      if (updateError) {
        return {
          success: false,
          error: updateError.message
        };
      }

      // The trigger will automatically handle stock reduction and financial transactions
      // when status is changed to 'delivered'

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get order details by ID
   */
  static async getOrderDetails(orderId: string): Promise<WebsiteOrder | null> {
    try {
      const { data: order, error } = await supabase
        .from('website_orders_for_erp')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching order details:', error);
        return null;
      }

      return order;
    } catch (error) {
      console.error('Error in getOrderDetails:', error);
      return null;
    }
  }

  /**
   * Delete order and its items
   */
  static async deleteOrder(orderId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get order number before deleting
      const { data: order } = await supabase
        .from('sales_orders')
        .select('order_number')
        .eq('id', orderId)
        .single();

      // First delete order items
      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('sales_order_id', orderId);

      if (itemsError) {
        return {
          success: false,
          error: `Failed to delete order items: ${itemsError.message}`
        };
      }

      // Delete associated financial transaction if exists
      if (order?.order_number) {
        await supabase
          .from('financial_transactions')
          .delete()
          .eq('reference_number', order.order_number)
          .eq('category', 'sales');
      }

      // Then delete the order
      const { error: orderError } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', orderId);

      if (orderError) {
        return {
          success: false,
          error: `Failed to delete order: ${orderError.message}`
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export for use in Supabase Edge Functions or Vercel API routes
export default OrderSyncAPI; 