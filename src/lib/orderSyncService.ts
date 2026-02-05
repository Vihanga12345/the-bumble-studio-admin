import { supabase } from '@/integrations/supabase/client';

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

export interface SyncOrderResponse {
  success: boolean;
  orderId?: string;
  error?: string;
}

export class OrderSyncService {
  private static instance: OrderSyncService;
  private readonly ERP_BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000'; // Default business ID for e-commerce orders

  public static getInstance(): OrderSyncService {
    if (!OrderSyncService.instance) {
      OrderSyncService.instance = new OrderSyncService();
    }
    return OrderSyncService.instance;
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    return `WEB-${timestamp}`;
  }

  private async findOrCreateCustomer(customerInfo: EcommerceOrderData['customerInfo']): Promise<string> {
    try {
      // First, try to find existing customer by email
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerInfo.email)
        .eq('business_id', this.ERP_BUSINESS_ID)
        .single();

      if (existingCustomer) {
        return existingCustomer.id;
      }

      // Create new customer if not found
      const customerData = {
        name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
        email: customerInfo.email,
        telephone: customerInfo.phone,
        address: `${customerInfo.address}, ${customerInfo.city}, ${customerInfo.state} ${customerInfo.postalCode}, ${customerInfo.country}`,
        business_id: this.ERP_BUSINESS_ID
      };

      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert(customerData)
        .select('id')
        .single();

      if (customerError) throw customerError;

      return newCustomer.id;
    } catch (error) {
      console.error('Error finding/creating customer:', error);
      throw new Error('Failed to process customer information');
    }
  }

  private async findOrCreateInventoryItems(items: EcommerceOrderData['items']): Promise<{ [key: string]: string }> {
    const inventoryMap: { [key: string]: string } = {};

    for (const item of items) {
      try {
        // Try to find existing inventory item by name or SKU
        let query = supabase
          .from('inventory_items')
          .select('id')
          .eq('business_id', this.ERP_BUSINESS_ID);

        if (item.sku) {
          query = query.eq('sku', item.sku);
        } else {
          query = query.eq('name', item.productName);
        }

        const { data: existingItem } = await query.single();

        if (existingItem) {
          inventoryMap[item.productId] = existingItem.id;
        } else {
          // Create new inventory item
          const inventoryData = {
            name: item.productName,
            sku: item.sku || `WEB-${item.productId}`,
            description: `Product from e-commerce website`,
            category: 'Website Products',
            unit_of_measure: 'pcs',
            selling_price: item.unitPrice,
            purchase_cost: item.unitPrice * 0.7, // Assume 30% margin
            current_stock: 0, // Website products don't affect physical inventory
            reorder_level: 0,
            is_active: true,
            business_id: this.ERP_BUSINESS_ID
          };

          const { data: newItem, error: itemError } = await supabase
            .from('inventory_items')
            .insert(inventoryData)
            .select('id')
            .single();

          if (itemError) throw itemError;

          inventoryMap[item.productId] = newItem.id;
        }
      } catch (error) {
        console.error(`Error processing item ${item.productName}:`, error);
        throw new Error(`Failed to process product: ${item.productName}`);
      }
    }

    return inventoryMap;
  }

  public async syncOrderToERP(orderData: EcommerceOrderData): Promise<SyncOrderResponse> {
    try {
      console.log('Starting order sync for order:', orderData.orderId);

      // Step 1: Find or create customer
      const customerId = await this.findOrCreateCustomer(orderData.customerInfo);

      // Step 2: Find or create inventory items
      const inventoryMap = await this.findOrCreateInventoryItems(orderData.items);

      // Step 3: Create sales order
      const orderNumber = this.generateOrderNumber();
      const salesOrderData = {
        order_number: orderNumber,
        customer_id: customerId,
        order_date: orderData.orderDate,
        total_amount: orderData.totalAmount,
        status: 'Order Confirmed', // Default status for website orders
        payment_method: orderData.paymentMethod,
        notes: 'Website Sales', // This identifies it as a website order
        business_id: this.ERP_BUSINESS_ID
      };

      const { data: salesOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert(salesOrderData)
        .select('id')
        .single();

      if (orderError) throw orderError;

      // Step 4: Create sales order items
      const orderItems = orderData.items.map(item => ({
        sales_order_id: salesOrder.id,
        product_id: inventoryMap[item.productId],
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        discount: 0
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      console.log('Order sync completed successfully:', {
        originalOrderId: orderData.orderId,
        erpOrderId: salesOrder.id,
        orderNumber
      });

      return {
        success: true,
        orderId: salesOrder.id
      };

    } catch (error) {
      console.error('Error syncing order to ERP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Method to be called from e-commerce checkout
  public async handleCheckoutOrder(orderData: EcommerceOrderData): Promise<SyncOrderResponse> {
    // Add validation
    if (!orderData.orderId || !orderData.customerInfo.email || orderData.items.length === 0) {
      return {
        success: false,
        error: 'Invalid order data'
      };
    }

    // Sync to ERP
    return await this.syncOrderToERP(orderData);
  }

  // API endpoint that can be called from external e-commerce site
  public async createAPIEndpoint() {
    // This would be used to create a webhook or API endpoint
    // that the e-commerce site can call after order placement
    return {
      endpoint: '/api/sync-order',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    };
  }
}

// Export singleton instance
export const orderSyncService = OrderSyncService.getInstance(); 