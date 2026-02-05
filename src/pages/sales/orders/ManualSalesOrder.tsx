import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, ArrowLeft, Package, GripVertical, Edit, Trash, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useInventory } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import OrderMilestones from '@/components/orders/OrderMilestones';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  variantId?: string; // Selected variant ID from DB
  variantName?: string; // Selected product variant name
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  imageUrl?: string;
}

type OrderStatus = 'Order Confirmed' | 'Advance Paid' | 'Crafted' | 'Delivered' | 'Full Payment Done';

interface InvoiceLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const renderInvoiceLayout = (
  doc: jsPDF,
  params: {
    orderNumber: string;
    orderDate: string;
    customerName: string;
    customerAddress: string;
    customerTelephone: string;
    items: InvoiceLineItem[];
    subtotal: number;
    orderDiscount?: number;
    additionalCosts?: number;
    deliveryCost?: number;
    advancePayment: number;
    remainingBalance: number;
  }
) => {
  const pageWidth = doc.internal.pageSize.width;
  const leftX = 20;
  const rightX = pageWidth - 20;
  const centerX = pageWidth / 2;

  const formatRs = (value: number) => `Rs ${value.toFixed(2)}`;

  let y = 15;
  
  // Add logo
  try {
    const logoPath = '/The Bumble Studio LOGO.png';
    doc.addImage(logoPath, 'PNG', centerX - 15, y, 30, 30);
    y += 35;
  } catch (error) {
    console.log('Logo not loaded, continuing without it');
    y += 5;
  }
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('The Bumble Studio', centerX, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', centerX, y, { align: 'center' });
  y += 8;
  
  doc.setLineWidth(0.5);
  doc.line(leftX, y, rightX, y);
  y += 10;

  doc.setFontSize(10);
  doc.text('ISSUED TO:', leftX, y);
  doc.text('ORDER NO:', rightX, y, { align: 'right' });
  y += 6;

  const customerLines = [
    params.customerName,
    ...params.customerAddress.split(',').map(line => line.trim()).filter(Boolean),
    params.customerTelephone ? params.customerTelephone : ''
  ].filter(Boolean);

  doc.text(customerLines, leftX, y);
  doc.text(params.orderNumber, rightX, y, { align: 'right' });
  y += Math.max(customerLines.length * 5, 5);
  doc.text(params.orderDate, rightX, y, { align: 'right' });
  y += 10;

  doc.line(leftX, y, rightX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['DESCRIPTION', 'UNIT PRICE', 'QTY', 'TOTAL']],
    body: params.items.map(item => [
      item.name,
      formatRs(item.unitPrice),
      item.quantity.toString(),
      formatRs(item.totalPrice)
    ]),
    theme: 'plain',
    headStyles: {
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: {
      fontSize: 10,
      cellPadding: 2
    },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    },
    margin: { left: leftX, right: 20 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  doc.line(leftX, finalY, rightX, finalY);

  let totalsY = finalY + 10;
  
  // Subtotal
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', rightX - 50, totalsY);
  doc.text(formatRs(params.subtotal), rightX, totalsY, { align: 'right' });
  totalsY += 7;
  
  // Order discount if provided
  if (params.orderDiscount && params.orderDiscount > 0) {
    doc.setTextColor(0, 128, 0);
    doc.text('Order Discount', rightX - 50, totalsY);
    doc.text(`-${formatRs(params.orderDiscount)}`, rightX, totalsY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    totalsY += 7;
  }
  
  // Additional costs if provided
  if (params.additionalCosts && params.additionalCosts > 0) {
    doc.text('Additional Costs', rightX - 50, totalsY);
    doc.text(formatRs(params.additionalCosts), rightX, totalsY, { align: 'right' });
    totalsY += 7;
  }
  
  // Delivery cost if provided
  if (params.deliveryCost && params.deliveryCost > 0) {
    doc.text('Delivery Cost', rightX - 50, totalsY);
    doc.text(formatRs(params.deliveryCost), rightX, totalsY, { align: 'right' });
    totalsY += 7;
  }
  
  // Draw line before total
  doc.setLineWidth(0.3);
  doc.line(rightX - 70, totalsY, rightX, totalsY);
  totalsY += 8;
  
  // Total
  const grandTotal = params.subtotal - (params.orderDiscount || 0) + (params.additionalCosts || 0) + (params.deliveryCost || 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total', rightX - 50, totalsY);
  doc.text(formatRs(grandTotal), rightX, totalsY, { align: 'right' });
  totalsY += 10;
  
  // Advance payment
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Advance (50%)', rightX - 50, totalsY);
  doc.text(formatRs(params.advancePayment), rightX, totalsY, { align: 'right' });
  totalsY += 7;
  
  // Amount due
  doc.setFont('helvetica', 'bold');
  doc.text('Amount due', rightX - 50, totalsY);
  doc.text(formatRs(params.remainingBalance), rightX, totalsY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  totalsY += 15;
  
  // Add Terms & Conditions and Bank Details at the bottom
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(leftX, totalsY, rightX, totalsY);
  totalsY += 8;
  
  // Terms & Conditions
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', leftX, totalsY);
  totalsY += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const terms = [
    '50% advanced payment needs to be made for order confirmation',
    'Remaining amount should be paid upon delivery.',
    'A payment receipt',
    'Delivery charges is only 500 LKR',
    'Payment needs to be made to below mentioned bank account'
  ];
  
  terms.forEach(term => {
    doc.text(`• ${term}`, leftX + 2, totalsY);
    totalsY += 5;
  });
  
  totalsY += 5;
  
  // Bank Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Details:', leftX, totalsY);
  totalsY += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const bankDetails = [
    'Account No: 076020269000',
    'Hatton National Bank',
    'HNB - CINNAMON GARDENS Branch',
    'JAYAMANNE M D V D'
  ];
  
  bankDetails.forEach(detail => {
    doc.text(detail, leftX + 2, totalsY);
    totalsY += 5;
  });
};

const ManualSalesOrder = () => {
  const navigate = useNavigate();
  const { items } = useInventory();
  const [showForm, setShowForm] = useState(false);
  const [existingOrders, setExistingOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [previousOrderStatus, setPreviousOrderStatus] = useState<OrderStatus | null>(null);
  
  // Filter only selling items - EXCLUDE variant items (only show main items)
  const sellingItems = items.filter(item => 
    item.itemCategory === 'Selling' && 
    item.isActive && 
    !item.isVariant  // Exclude variant items from main list
  );
  
  // Customer details
  const [customerName, setCustomerName] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerTelephone, setCustomerTelephone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Order details
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('Order Confirmed');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [advancePaymentPercentage, setAdvancePaymentPercentage] = useState<number>(50);
  const [additionalCosts, setAdditionalCosts] = useState<number>(0);
  const [deliveryCost, setDeliveryCost] = useState<number>(0);
  
  // Order items
  const [saleItems, setSaleItems] = useState<OrderItem[]>([
    {
      id: '1',
      productId: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      totalPrice: 0
    }
  ]);

  // Drag and drop state
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  // Variants state
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, any[]>>({});

  const generateUniqueOrderNumber = async (): Promise<string> => {
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

  const loadExistingOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          sales_order_items (
            id,
            inventory_item_id,
            variant_item_id,
            quantity,
            unit_price,
            discount
          )
        `)
        .order('order_date', { ascending: false });
      
      if (error) throw error;

      const orders = data || [];
      const itemIds = new Set<string>();
      orders.forEach((order: any) => {
        (order.sales_order_items || []).forEach((item: any) => {
          if (item.variant_item_id) itemIds.add(item.variant_item_id);
          else if (item.inventory_item_id) itemIds.add(item.inventory_item_id);
        });
      });

      let imageById: Record<string, string> = {};
      if (itemIds.size > 0) {
        const { data: itemsData } = await supabase
          .from('inventory_items')
          .select('id, image_url')
          .in('id', Array.from(itemIds));
        (itemsData || []).forEach((item: any) => {
          imageById[item.id] = item.image_url || '';
        });
      }

      const enrichedOrders = orders.map((order: any) => {
        const firstItem = (order.sales_order_items || [])[0];
        const firstImageId = firstItem?.variant_item_id || firstItem?.inventory_item_id;
        return {
          ...order,
          first_item_image: firstImageId ? imageById[firstImageId] : ''
        };
      });

      setExistingOrders(enrichedOrders);
    } catch (error) {
      console.error('Error loading sales orders:', error);
      toast.error('Failed to load sales orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadExistingOrders();
  }, []);

  const handleEditOrder = async (orderId: string) => {
    const order = existingOrders.find(o => o.id === orderId);
    if (!order) return;

    setEditingOrderId(orderId);
    setPreviousOrderStatus(order.order_status || 'Order Confirmed');
    setCustomerName(order.customer_name || '');
    setCustomerAddress(order.customer_address || '');
    setCustomerTelephone(order.customer_telephone || '');
    setNotes(order.notes || '');
    setOrderStatus(order.order_status || 'Order Confirmed');
    setDiscountPercentage(Number(order.discount_percentage || 0));
    setAdvancePaymentPercentage(Number(order.advance_payment_percentage || 50));
    setAdditionalCosts(Number(order.additional_costs || 0));
    setDeliveryCost(Number(order.delivery_cost || 0));

    if (order.sales_order_items && order.sales_order_items.length > 0) {
      const items = await Promise.all(order.sales_order_items.map(async (item: any) => {
        let productName = '';
        let productImage = '';
        let variantName = '';

        if (item.inventory_item_id) {
          const { data: product } = await supabase
            .from('inventory_items')
            .select('name, image_url')
            .eq('id', item.inventory_item_id)
            .single();
          productName = product?.name || '';
          productImage = product?.image_url || '';
        }

        if (item.variant_item_id) {
          const { data: variant } = await supabase
            .from('inventory_items')
            .select('variant_name, image_url')
            .eq('id', item.variant_item_id)
            .single();
          variantName = variant?.variant_name || '';
          if (variant?.image_url) {
            productImage = variant.image_url;
          }
        }

        return {
          id: item.id,
          productId: item.inventory_item_id || '',
          name: productName,
          variantId: item.variant_item_id || '',
          variantName,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount || 0,
          totalPrice: (item.quantity * item.unit_price) - (item.discount || 0),
          imageUrl: productImage
        };
      }));
      setSaleItems(items);
    } else {
      setSaleItems([{
        id: '1',
        productId: '',
        name: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        totalPrice: 0
      }]);
    }

    setShowForm(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      // Get order number before deleting
      const { data: order } = await supabase
        .from('sales_orders')
        .select('order_number')
        .eq('id', orderId)
        .single();

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('sales_order_id', orderId);

      if (itemsError) throw itemsError;

      // Delete associated financial transaction if exists
      if (order?.order_number) {
        await supabase
          .from('financial_transactions')
          .delete()
          .eq('reference_number', order.order_number)
          .eq('category', 'sales');
      }

      const { error: orderError } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast.success('Sales order deleted');
      await loadExistingOrders();
    } catch (error) {
      console.error('Error deleting sales order:', error);
      toast.error('Failed to delete sales order');
    }
  };

  const handleAddItem = () => {
    setSaleItems([
      ...saleItems,
      {
        id: Date.now().toString(),
        productId: '',
        name: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        totalPrice: 0
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter(item => item.id !== id));
    } else {
      toast.error('You must have at least one item in the sales order');
    }
  };

  const loadVariants = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('parent_item_id', parentId)
        .eq('is_variant', true)
        .gt('current_stock', 0); // Only variants with stock
      
      if (error) throw error;
      
      setVariantsByProduct(prev => ({
        ...prev,
        [parentId]: data || []
      }));
    } catch (error) {
      console.error('Error loading variants:', error);
    }
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: string | number) => {
    setSaleItems(
      saleItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // If productId changed, update the item details and load variants
          if (field === 'productId' && value) {
            const inventoryItem = sellingItems.find(invItem => invItem.id === value);
            if (inventoryItem) {
              updatedItem.name = inventoryItem.name;
              updatedItem.unitPrice = inventoryItem.sellingPrice;
              updatedItem.imageUrl = inventoryItem.imageUrl;
              updatedItem.variantId = undefined; // Reset variant
              updatedItem.variantName = undefined;
              // Apply item discount if available
              const itemDiscountAmount = inventoryItem.discountPercentage 
                ? (inventoryItem.sellingPrice * inventoryItem.discountPercentage / 100) 
                : 0;
              updatedItem.discount = itemDiscountAmount * updatedItem.quantity;
              // Recalculate total price
              updatedItem.totalPrice = (inventoryItem.sellingPrice * updatedItem.quantity) - updatedItem.discount;
              // Load variants for this product
              loadVariants(value as string);
            }
          }
          
          // If variantId changed, update pricing from variant
          if (field === 'variantId' && value) {
            const variants = variantsByProduct[item.productId] || [];
            const selectedVariant = variants.find(v => v.id === value);
            if (selectedVariant) {
              updatedItem.variantName = selectedVariant.variant_name;
              updatedItem.unitPrice = selectedVariant.selling_price || selectedVariant.sellingPrice;
              updatedItem.totalPrice = (updatedItem.unitPrice * updatedItem.quantity) - updatedItem.discount;
            }
          }
          
          // Recalculate total price if quantity or unit price changes
          if (field === 'quantity' || field === 'unitPrice') {
            const quantity = Number(value);
            const unitPrice = field === 'unitPrice' ? Number(value) : updatedItem.unitPrice;
            const inventoryItem = sellingItems.find(invItem => invItem.id === item.productId);
            if (inventoryItem && inventoryItem.discountPercentage) {
              const itemDiscountAmount = (unitPrice * inventoryItem.discountPercentage / 100);
              updatedItem.discount = itemDiscountAmount * quantity;
            }
            updatedItem.totalPrice = (unitPrice * quantity) - updatedItem.discount;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null) return;
    
    const newItems = [...saleItems];
    const [draggedItem] = newItems.splice(draggedItemIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    setSaleItems(newItems);
    setDraggedItemIndex(null);
  };

  const calculateSubtotal = () => {
    return saleItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  };

  const calculateItemDiscounts = () => {
    return saleItems.reduce((total, item) => total + item.discount, 0);
  };

  const calculateSubtotalAfterItemDiscounts = () => {
    return calculateSubtotal() - calculateItemDiscounts();
  };

  const calculateOrderDiscount = () => {
    return calculateSubtotalAfterItemDiscounts() * (discountPercentage / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotalAfterItemDiscounts() - calculateOrderDiscount() + additionalCosts + deliveryCost;
  };

  const calculateAdvancePayment = () => {
    return calculateTotal() * (advancePaymentPercentage / 100);
  };

  const calculateRemainingBalance = () => {
    return calculateTotal() - calculateAdvancePayment();
  };

  const generatePDF = async (orderId: string, orderDate: string) => {
    const doc = new jsPDF();
    const cleanCustomerName = customerName.trim() === 'Walk-in Customer' ? '' : customerName;
    const lineItems = saleItems
      .filter(item => item.productId)
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }));

    renderInvoiceLayout(doc, {
      orderNumber: orderId.substring(0, 8),
      orderDate,
      customerName: cleanCustomerName,
      customerAddress,
      customerTelephone,
      items: lineItems,
      subtotal: calculateSubtotalAfterItemDiscounts(),
      orderDiscount: calculateOrderDiscount(),
      additionalCosts: additionalCosts,
      deliveryCost: deliveryCost,
      advancePayment: calculateAdvancePayment(),
      remainingBalance: calculateRemainingBalance()
    });

    doc.save(`The_Bumble_Studio_Invoice_${orderId.substring(0, 8)}.pdf`);
    toast.success('PDF invoice generated successfully!');
  };

  const generatePDFForOrder = async (orderId: string) => {
    try {
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('*')
        .eq('sales_order_id', orderId);

      if (itemsError) throw itemsError;

      const itemIds = (items || []).map((item: any) => item.variant_item_id || item.inventory_item_id).filter(Boolean);
      let itemMap: Record<string, any> = {};
      if (itemIds.length > 0) {
        const { data: inventoryItems } = await supabase
          .from('inventory_items')
          .select('id, name, variant_name')
          .in('id', itemIds);
        (inventoryItems || []).forEach((item: any) => {
          itemMap[item.id] = item;
        });
      }

      const tableItems = (items || []).map((item: any) => {
        const itemData = itemMap[item.variant_item_id || item.inventory_item_id] || {};
        return {
          name: itemData.variant_name ? `${itemData.name} - ${itemData.variant_name}` : itemData.name || 'Item',
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount || 0,
          totalPrice: item.total_price || (item.quantity * item.unit_price) - (item.discount || 0)
        };
      });

      const doc = new jsPDF();
      const lineItems = tableItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.totalPrice || 0)
      }));

      renderInvoiceLayout(doc, {
        orderNumber: order.order_number,
        orderDate: order.order_date ? new Date(order.order_date).toLocaleDateString() : '',
        customerName: order.customer_name || '',
        customerAddress: order.customer_address || '',
        customerTelephone: order.customer_telephone || '',
        items: lineItems,
        subtotal: Number(order.subtotal_amount || 0),
        orderDiscount: Number(order.discount_amount || 0),
        additionalCosts: Number(order.additional_costs || 0),
        deliveryCost: Number(order.delivery_cost || 0),
        advancePayment: Number(order.advance_payment_amount || 0),
        remainingBalance: Number(order.remaining_balance || 0)
      });

      doc.save(`The_Bumble_Studio_Invoice_${order.order_number}.pdf`);
      toast.success('PDF invoice generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleCreateOrder = async () => {
    // Validation
    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }

    if (!customerAddress.trim()) {
      toast.error('Please enter customer address');
      return;
    }

    if (!customerTelephone.trim()) {
      toast.error('Please enter customer telephone');
      return;
    }

    const validItems = saleItems.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }

    try {
      const orderNumber = editingOrderId
        ? existingOrders.find(o => o.id === editingOrderId)?.order_number
        : await generateUniqueOrderNumber();
      
      const orderData = {
        order_number: orderNumber,
        customer_name: customerName,
        customer_address: customerAddress,
        customer_telephone: customerTelephone,
        order_status: orderStatus,
        discount_percentage: discountPercentage,
        discount_amount: calculateOrderDiscount(),
        advance_payment_percentage: advancePaymentPercentage,
        advance_payment_amount: calculateAdvancePayment(),
        remaining_balance: calculateRemainingBalance(),
        subtotal_amount: calculateSubtotal(),
        additional_costs: additionalCosts,
        delivery_cost: deliveryCost,
        total_amount: calculateTotal(),
        order_date: new Date().toISOString(),
        order_source: 'manual',
        status: 'pending',
        notes: notes
      };

      let orderId = editingOrderId;
      if (editingOrderId) {
        const { error: updateError } = await supabase
          .from('sales_orders')
          .update(orderData)
          .eq('id', editingOrderId);
        if (updateError) throw updateError;

        const { error: deleteItemsError } = await supabase
          .from('sales_order_items')
          .delete()
          .eq('sales_order_id', editingOrderId);
        if (deleteItemsError) throw deleteItemsError;
      } else {
        const { data: order, error: orderError } = await supabase
          .from('sales_orders')
          .insert([orderData])
          .select()
          .single();
        if (orderError) throw orderError;
        orderId = order.id;
      }

      const orderItems = validItems.map(item => ({
        sales_order_id: orderId,
        inventory_item_id: item.productId,
        variant_item_id: item.variantId || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount,
        total_price: (item.quantity * item.unitPrice) - (item.discount || 0)
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems);
      if (itemsError) throw itemsError;

      // Note: Financial transactions are now handled by database trigger
      // when order status changes to 'delivered'. This prevents duplicates.

      if (orderStatus === 'Delivered' && previousOrderStatus !== 'Delivered') {
        for (const item of orderItems) {
          await supabase.rpc('record_inventory_transaction', {
            p_item_id: item.inventory_item_id,
            p_transaction_type: 'sales_order',
            p_quantity_change: -item.quantity,
            p_variant_item_id: item.variant_item_id,
            p_reference_id: orderId,
            p_reference_type: 'sales_order',
            p_notes: `Sales order delivered: ${orderNumber}`,
            p_created_by: null
          });
        }
      }

      toast.success(editingOrderId ? 'Sales order updated successfully!' : 'Sales order created successfully!');
      setShowForm(false);
      setEditingOrderId(null);
      setPreviousOrderStatus(null);
      await loadExistingOrders();
    } catch (error) {
      console.error('Error creating sales order:', error);
      toast.error('Failed to create sales order: ' + (error as Error).message);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/sales')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Manual Sales Orders</h1>
                <p className="text-muted-foreground">Manage and create manual sales orders</p>
              </div>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sales Order
              </Button>
            )}
            {showForm && (
              <Button onClick={handleCreateOrder} size="lg">
                {editingOrderId ? 'Update Order' : 'Create Order'}
              </Button>
            )}
          </div>

          {!showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Sales Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Advance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingOrders ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          Loading orders...
                        </TableCell>
                      </TableRow>
                    ) : existingOrders.length > 0 ? (
                      existingOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell>
                            {order.first_item_image ? (
                              <img
                                src={order.first_item_image}
                                alt="Item"
                                className="w-10 h-10 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg?height=40&width=40';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{order.customer_name || 'Walk-in Customer'}</TableCell>
                          <TableCell>{order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <Badge>{order.order_status || 'Order Confirmed'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">Rs {Number(order.total_amount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">Rs {Number(order.advance_payment_amount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => generatePDFForOrder(order.id)}>
                                <FileDown className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditOrder(order.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteOrder(order.id)}>
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          No sales orders found. Click "Add Sales Order" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {showForm && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setPreviousOrderStatus(null);
                }}
              >
                Back to List
              </Button>
            </div>
          )}

          {showForm && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Items - Main Section */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price (Rs)</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((item, index) => {
                      const inventoryItem = sellingItems.find(inv => inv.id === item.productId);
                      return (
                        <TableRow 
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          className="cursor-move hover:bg-muted/50"
                        >
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell>
                            {inventoryItem?.imageUrl ? (
                              <img 
                                src={inventoryItem.imageUrl} 
                                alt={inventoryItem.name}
                                className="w-12 h-12 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg?height=48&width=48';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            <Select 
                              value={item.productId} 
                              onValueChange={(value) => handleItemChange(item.id, 'productId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select an item" />
                              </SelectTrigger>
                              <SelectContent>
                                {sellingItems.map(sellingItem => (
                                  <SelectItem 
                                    key={sellingItem.id} 
                                    value={sellingItem.id}
                                  >
                                    <div className="flex flex-col">
                                      <span>{sellingItem.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        Rs {sellingItem.sellingPrice || 0}
                                        {sellingItem.discountPercentage ? ` | ${sellingItem.discountPercentage}% OFF` : ''}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            {(() => {
                              const variants = variantsByProduct[item.productId] || [];
                              return variants.length > 0 ? (
                                <Select 
                                  value={item.variantId || ''} 
                                  onValueChange={(value) => handleItemChange(item.id, 'variantId', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select variant" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {variants.map((variant) => (
                                      <SelectItem key={variant.id} value={variant.id}>
                                        {variant.variant_name} (Stock: {variant.current_stock})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm text-muted-foreground">No variants</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-28 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {item.discount > 0 ? (
                              <span className="text-green-600 font-medium">
                                -Rs {item.discount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            Rs {item.totalPrice.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-4">
                  <Button variant="outline" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {/* Order Summary */}
                <div className="mt-6 border-t pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">Rs {calculateSubtotal().toFixed(2)}</span>
                  </div>
                  
                  {calculateItemDiscounts() > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Item Discounts:</span>
                      <span className="font-medium">-Rs {calculateItemDiscounts().toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm">
                    <span>Order Discount:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                        className="w-20 h-8"
                      />
                      <span>%</span>
                      {discountPercentage > 0 && (
                        <span className="text-green-600 font-medium">
                          -Rs {calculateOrderDiscount().toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span>Additional Costs:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={additionalCosts}
                        onChange={(e) => setAdditionalCosts(parseFloat(e.target.value) || 0)}
                        className="w-32 h-8"
                        placeholder="0.00"
                      />
                      <span>Rs</span>
                      {additionalCosts > 0 && (
                        <span className="text-blue-600 font-medium">
                          +Rs {additionalCosts.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span>Delivery Cost:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={deliveryCost}
                        onChange={(e) => setDeliveryCost(parseFloat(e.target.value) || 0)}
                        className="w-32 h-8"
                        placeholder="0.00"
                      />
                      <span>Rs</span>
                      {deliveryCost > 0 && (
                        <span className="text-orange-600 font-medium">
                          +Rs {deliveryCost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>Total Amount:</span>
                    <span>Rs {calculateTotal().toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded">
                    <span>Advance Payment:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={advancePaymentPercentage}
                        onChange={(e) => setAdvancePaymentPercentage(parseFloat(e.target.value) || 0)}
                        className="w-20 h-8"
                      />
                      <span>%</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        Rs {calculateAdvancePayment().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Remaining Balance:</span>
                    <span className="font-medium">Rs {calculateRemainingBalance().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details - Sidebar */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      placeholder="Enter customer name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customerAddress">Address *</Label>
                    <Textarea
                      id="customerAddress"
                      placeholder="Enter customer address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customerTelephone">Telephone Number *</Label>
                    <Input
                      id="customerTelephone"
                      placeholder="Enter telephone number"
                      value={customerTelephone}
                      onChange={(e) => setCustomerTelephone(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderStatus">Current Status</Label>
                    <Select value={orderStatus} onValueChange={(value) => setOrderStatus(value as OrderStatus)}>
                      <SelectTrigger id="orderStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Order Confirmed">Order Confirmed</SelectItem>
                        <SelectItem value="Advance Paid">Advance Paid</SelectItem>
                        <SelectItem value="Crafted">Crafted</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Full Payment Done">Full Payment Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Badge 
                      variant={orderStatus === 'Order Confirmed' ? 'default' : 'secondary'}
                      className="justify-center"
                    >
                      Order Confirmed
                    </Badge>
                    <Badge 
                      variant={orderStatus === 'Advance Paid' ? 'default' : 'secondary'}
                      className="justify-center"
                    >
                      Advance Paid
                    </Badge>
                    <Badge 
                      variant={orderStatus === 'Crafted' ? 'default' : 'secondary'}
                      className="justify-center"
                    >
                      Crafted
                    </Badge>
                    <Badge 
                      variant={orderStatus === 'Delivered' ? 'default' : 'secondary'}
                      className="justify-center"
                    >
                      Delivered
                    </Badge>
                    <Badge 
                      variant={orderStatus === 'Full Payment Done' ? 'default' : 'secondary'}
                      className="justify-center"
                    >
                      Full Payment Done
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add any notes or special instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Order Milestones - Show only when editing existing order */}
            {editingOrderId && (
              <div className="lg:col-span-3">
                <OrderMilestones 
                  orderId={editingOrderId} 
                  orderNumber={existingOrders.find(o => o.id === editingOrderId)?.order_number || ''} 
                />
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ManualSalesOrder;
