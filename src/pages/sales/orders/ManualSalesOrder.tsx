import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, ArrowLeft, Package, GripVertical, Edit, Trash, FileDown, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useInventory } from '@/hooks/useInventory';
import { useHides } from '@/hooks/useHides';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getCrafterHourlyRate, getCrafterProfitMargin } from '@/lib/crafterSettings';

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
  selectedHideId?: string;
  selectedHideIds?: string[];
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  imageUrl?: string;
}

interface LinkedHideRow {
  id: string;
  hideId: string;
  productId: string;
  quantity: number;
  manHours: number;
  unitCostPerProduct: number;
  lineTotal: number;
}

interface CostLineRow {
  id: string;
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

interface EngravingRow {
  id: string;
  enabled: boolean;
  amount: number;
  text: string;
}

type OrderStatus = 'Order Confirmed' | 'Advance Paid' | 'Full Payment Done';
type FulfillmentStatus =
  | 'Order Confirmed'
  | 'Advance Paid'
  | 'Leathers Selected'
  | 'Cut Pieces'
  | 'Stitching'
  | 'Burnishing'
  | 'Packed'
  | 'Remaining Amount Paid'
  | 'Delivered';

const WORKFLOW_ORDER: FulfillmentStatus[] = [
  'Order Confirmed',
  'Advance Paid',
  'Leathers Selected',
  'Cut Pieces',
  'Stitching',
  'Burnishing',
  'Packed',
  'Remaining Amount Paid',
  'Delivered',
];

interface InvoiceLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const LOGO_URL = '/bumble-logo.png';
let cachedLogoDataUrl: string | null = null;
const loadLogoDataUrl = async (): Promise<string | null> => {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return null;
    const blob = await response.blob();
    cachedLogoDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    return cachedLogoDataUrl;
  } catch {
    return null;
  }
};

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
    logoDataUrl?: string | null;
  }
) => {
  const pageWidth = doc.internal.pageSize.width;
  const leftX = 20;
  const rightX = pageWidth - 20;
  const centerX = pageWidth / 2;

  const formatRs = (value: number) => `Rs ${value.toFixed(2)}`;

  let y = 15;
  
  // Add logo (data URL required for jsPDF reliability)
  if (params.logoDataUrl) {
    try {
      doc.addImage(params.logoDataUrl, 'PNG', centerX - 15, y, 30, 30);
      y += 50;
    } catch (error) {
      console.log('Logo not loaded, continuing without it');
      y += 5;
    }
  } else {
    y += 5;
  }
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Bumble Studio', centerX, y, { align: 'center' });
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
  doc.text('Advance payment', rightX - 50, totalsY);
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
    'Remaining amount should be paid before sent for delivery.',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { items } = useInventory();
  const { getAvailableHides } = useHides();
  const [showForm, setShowForm] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'sale' | 'craft'>('sale');
  const [existingOrders, setExistingOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
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
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState<number>(0);
  const [engravingRows, setEngravingRows] = useState<EngravingRow[]>([
    {
      id: 'engraving-1',
      enabled: false,
      amount: 1000,
      text: ''
    }
  ]);
  const [engravingCoveredAmount, setEngravingCoveredAmount] = useState<number>(0);
  const [deliveryCost, setDeliveryCost] = useState<number>(0);
  const [numberOfHours, setNumberOfHours] = useState<number>(0);
  const [hourlyFee, setHourlyFee] = useState<number>(200);
  const [defaultCrafterHourlyRate, setDefaultCrafterHourlyRate] = useState<number>(200);
  const [profitMarginPercentage, setProfitMarginPercentage] = useState<number>(150);
  const [defaultProfitMarginPercentage, setDefaultProfitMarginPercentage] = useState<number>(150);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus>('Order Confirmed');
  
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
  const [linkedHides, setLinkedHides] = useState<LinkedHideRow[]>([]);
  const [costLines, setCostLines] = useState<CostLineRow[]>([]);
  const addEngravingRow = () => {
    setEngravingRows((prev) => [
      ...prev,
      {
        id: `engraving-${Date.now()}-${prev.length}`,
        enabled: false,
        amount: 1000,
        text: ''
      }
    ]);
  };

  const updateEngravingRow = (rowId: string, updates: Partial<Pick<EngravingRow, 'enabled' | 'amount' | 'text'>>) => {
    setEngravingRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row))
    );
  };

  const removeEngravingRow = (rowId: string) => {
    setEngravingRows((prev) => prev.filter((row) => row.id !== rowId));
  };


  // Drag and drop state
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  const availableHides = getAvailableHides();
  const craftingItems = items.filter(item => item.itemCategory === 'Crafting' && item.isActive);

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

  useEffect(() => {
    const loadCrafterSettings = async () => {
      const [rate, margin] = await Promise.all([
        getCrafterHourlyRate(),
        getCrafterProfitMargin(),
      ]);
      setDefaultCrafterHourlyRate(rate);
      setDefaultProfitMarginPercentage(margin);
      if (!editingOrderId) {
        setHourlyFee(rate);
        setProfitMarginPercentage(margin);
      }
    };

    loadCrafterSettings();
  }, [editingOrderId]);

  useEffect(() => {
    const targetOrderId = searchParams.get('editOrderId');
    if (!targetOrderId || isLoadingOrders || showForm) return;
    if (!existingOrders.some((order) => order.id === targetOrderId)) return;
    handleEditOrder(targetOrderId);
    setSearchParams((prev) => {
      prev.delete('editOrderId');
      prev.delete('source');
      return prev;
    });
  }, [existingOrders, isLoadingOrders, searchParams, setSearchParams, showForm]);

  const resetForm = () => {
    setActiveDetailsTab('sale');
    setEditingOrderId(null);
    setCustomerName('');
    setCustomerAddress('');
    setCustomerTelephone('');
    setNotes('');
    setDiscountPercentage(0);
    setEngravingRows([
      {
        id: 'engraving-1',
        enabled: false,
        amount: 1000,
        text: ''
      }
    ]);
    setEngravingCoveredAmount(0);
    setAdvancePaymentAmount(0);
    setDeliveryCost(0);
    setNumberOfHours(0);
    setHourlyFee(defaultCrafterHourlyRate);
    setProfitMarginPercentage(defaultProfitMarginPercentage);
    setFulfillmentStatus('Order Confirmed');
    setLinkedHides([]);
    setCostLines([]);
    setSaleItems([{
      id: '1',
      productId: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      totalPrice: 0,
      imageUrl: ''
    }]);
  };

  const handleEditOrder = async (orderId: string) => {
    const order = existingOrders.find(o => o.id === orderId);
    if (!order) return;

    setEditingOrderId(orderId);
    setCustomerName(order.customer_name || '');
    setCustomerAddress(order.customer_address || '');
    setCustomerTelephone(order.customer_telephone || '');
    setNotes(order.notes || '');
    setDiscountPercentage(Number(order.discount_percentage || 0));
    setAdvancePaymentAmount(Number(order.advance_payment_amount || 0));
    setEngravingCoveredAmount(Number(order.engraving_covered_amount || 0));
    setDeliveryCost(Number(order.delivery_cost || 0));
    setNumberOfHours(Number(order.number_of_hours || 0));
    setHourlyFee(
      order.hourly_fee !== null && order.hourly_fee !== undefined
        ? Number(order.hourly_fee)
        : defaultCrafterHourlyRate
    );
    setProfitMarginPercentage(Number(order.profit_margin_percentage || defaultProfitMarginPercentage));
    setFulfillmentStatus((order.status || 'Order Confirmed') as FulfillmentStatus);

    let loadedItems: OrderItem[] = [];
    if (order.sales_order_items && order.sales_order_items.length > 0) {
      loadedItems = await Promise.all(order.sales_order_items.map(async (item: any) => {
        let productName = '';
        let productImage = '';

        if (item.inventory_item_id) {
          const { data: product } = await supabase
            .from('inventory_items')
            .select('name, image_url')
            .eq('id', item.inventory_item_id)
            .single();
          productName = product?.name || '';
          productImage = product?.image_url || '';
        }

        return {
          id: item.id,
          productId: item.inventory_item_id || '',
          name: productName,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount || 0,
          totalPrice: (item.quantity * item.unit_price) - (item.discount || 0),
          imageUrl: productImage
        };
      }));
    } else {
      loadedItems = [{
        id: '1',
        productId: '',
        name: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        totalPrice: 0
      }];
    }

    const { data: linkedHideRows, error: linkedHideError } = await (supabase as any)
      .from('sales_order_hides')
      .select('*')
      .eq('sales_order_id', orderId);
    
    const linkedHideList = !linkedHideError && linkedHideRows ? linkedHideRows : [];
    setLinkedHides(
      linkedHideList.map((row: any) => ({
        id: row.id,
        hideId: row.hide_id || '',
        productId: row.product_id || '',
        quantity: Number(row.quantity || 0),
        manHours: Number(row.man_hours || 0),
        unitCostPerProduct: Number(row.unit_cost_per_product || 0),
        lineTotal: Number(row.line_total || 0)
      }))
    );
    
    const selectedHideIdsByProduct = new Map<string, string[]>();
    linkedHideList.forEach((r: any) => {
      if (r.product_id && r.hide_id) {
        const arr = selectedHideIdsByProduct.get(r.product_id) || [];
        if (!arr.includes(r.hide_id)) arr.push(r.hide_id);
        selectedHideIdsByProduct.set(r.product_id, arr);
      }
    });
    setSaleItems(loadedItems.map(item => {
      const hideIds = selectedHideIdsByProduct.get(item.productId) || [];
      return {
        ...item,
        selectedHideId: hideIds[0],
        selectedHideIds: hideIds
      };
    }));

    const { data: costLineRows, error: costLineError } = await (supabase as any)
      .from('sales_order_cost_lines')
      .select('*')
      .eq('sales_order_id', orderId);
    if (!costLineError) {
      const allCostLines = costLineRows || [];
      setCostLines(
        allCostLines
          .filter((row: any) => row.item_type === 'MATERIAL')
          .map((row: any) => ({
            id: row.id,
            inventoryItemId: row.inventory_item_id || '',
            quantity: Number(row.quantity || 0),
            unitCost: Number(row.unit_cost || 0),
            lineTotal: Number(row.line_total || 0)
          }))
      );

      const engravingLineRows = allCostLines.filter((row: any) => row.item_type === 'CUSTOM');
      if (engravingLineRows.length > 0) {
        setEngravingRows(
          engravingLineRows.map((row: any) => ({
            id: row.id,
            enabled: true,
            amount: Number(row.unit_cost || row.line_total || 0),
            text: row.description || ''
          }))
        );
      } else {
        const fallbackEngraving = Number(order.additional_costs || 0);
        setEngravingRows([
          {
            id: 'engraving-1',
            enabled: fallbackEngraving > 0,
            amount: fallbackEngraving > 0 ? fallbackEngraving : 1000,
            text: ''
          }
        ]);
      }
    } else {
      setCostLines([]);
      const fallbackEngraving = Number(order.additional_costs || 0);
      setEngravingRows([
        {
          id: 'engraving-1',
          enabled: fallbackEngraving > 0,
          amount: fallbackEngraving > 0 ? fallbackEngraving : 1000,
          text: ''
        }
      ]);
    }

    setShowForm(true);
    setActiveDetailsTab('sale');
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

  const handleAddHide = () => {
    setLinkedHides((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        hideId: '',
        productId: '',
        quantity: 1,
        manHours: 0,
        unitCostPerProduct: 0,
        lineTotal: 0
      }
    ]);
  };

  const handleHideChange = (
    rowId: string,
    changes: Partial<Pick<LinkedHideRow, 'hideId' | 'productId' | 'quantity' | 'manHours' | 'unitCostPerProduct'>>
  ) => {
    setLinkedHides((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, ...changes };
        if (changes.hideId) {
          const selectedHide = availableHides.find((hide) => hide.id === changes.hideId);
          if (selectedHide && (changes.unitCostPerProduct === undefined || changes.unitCostPerProduct === 0)) {
            next.unitCostPerProduct = selectedHide.costPerProduct || 0;
          }
        }
        next.lineTotal = (Number(next.quantity) || 0) * (Number(next.unitCostPerProduct) || 0);
        return next;
      })
    );
  };

  const handleRemoveHide = (rowId: string) => {
    setLinkedHides((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleAddCostLine = () => {
    setCostLines((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        inventoryItemId: '',
        quantity: 1,
        unitCost: 0,
        lineTotal: 0
      }
    ]);
  };

  const handleCostLineChange = (
    rowId: string,
    changes: Partial<Pick<CostLineRow, 'inventoryItemId' | 'quantity' | 'unitCost'>>
  ) => {
    setCostLines((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, ...changes };
        if (changes.inventoryItemId) {
          const material = craftingItems.find((item) => item.id === changes.inventoryItemId);
          if (material) {
            if (changes.unitCost === undefined || changes.unitCost === 0) {
              next.unitCost = material.sellingPrice || material.purchaseCost || 0;
            }
          }
        }
        next.lineTotal = (Number(next.quantity) || 0) * (Number(next.unitCost) || 0);
        return next;
      })
    );
  };

  const handleRemoveCostLine = (rowId: string) => {
    setCostLines((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: string | number | string[]) => {
    setSaleItems(
      saleItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          if (field === 'productId' && typeof value === 'string') {
            const inventoryItem = sellingItems.find(invItem => invItem.id === value);
            if (inventoryItem) {
              updatedItem.name = inventoryItem.name;
              updatedItem.unitPrice = inventoryItem.sellingPrice;
              updatedItem.imageUrl = inventoryItem.imageUrl;
              updatedItem.selectedHideId = undefined;
              updatedItem.selectedHideIds = [];
              const itemDiscountAmount = inventoryItem.discountPercentage 
                ? (inventoryItem.sellingPrice * inventoryItem.discountPercentage / 100) 
                : 0;
              updatedItem.discount = itemDiscountAmount * updatedItem.quantity;
              updatedItem.totalPrice = (inventoryItem.sellingPrice * updatedItem.quantity) - updatedItem.discount;
            }
            setLinkedHides((prev) => prev.filter((row) => row.productId !== item.productId));
          }
          
          if (field === 'quantity' || field === 'unitPrice') {
            const quantity = field === 'quantity' ? Number(value) : updatedItem.quantity;
            const unitPrice = field === 'unitPrice' ? Number(value) : updatedItem.unitPrice;
            const inventoryItem = sellingItems.find(invItem => invItem.id === item.productId);
            if (inventoryItem && inventoryItem.discountPercentage) {
              const itemDiscountAmount = (unitPrice * inventoryItem.discountPercentage / 100);
              updatedItem.discount = itemDiscountAmount * quantity;
            }
            updatedItem.totalPrice = (unitPrice * quantity) - updatedItem.discount;
            if (field === 'quantity' && item.productId) {
              setLinkedHides((prev) =>
                prev.map((row) =>
                  row.productId === item.productId
                    ? { ...row, quantity, lineTotal: quantity * (row.unitCostPerProduct || 0) }
                    : row
                )
              );
            }
          }
          
          if (field === 'selectedHideIds' && Array.isArray(value)) {
            updatedItem.selectedHideId = value[0];
            const productId = item.productId;
            if (!productId) return updatedItem;
            setLinkedHides((prev) => {
              const otherRows = prev.filter((row) => row.productId !== productId);
              const existingForProduct = prev.filter((row) => row.productId === productId);
              const existingByHide = new Map(existingForProduct.map((r) => [r.hideId, r]));
              const newRows: LinkedHideRow[] = [];
              for (const hideId of value) {
                const existing = existingByHide.get(hideId);
                const hide = availableHides.find((h) => h.id === hideId);
                const unitCost = hide?.costPerProduct ?? 0;
                if (existing) {
                  const qty = item.quantity;
                  newRows.push({
                    ...existing,
                    quantity: qty,
                    lineTotal: qty * (existing.unitCostPerProduct || 0)
                  });
                } else {
                  newRows.push({
                    id: `new-${Date.now()}-${hideId}`,
                    hideId,
                    productId,
                    quantity: item.quantity,
                    manHours: 0,
                    unitCostPerProduct: unitCost,
                    lineTotal: item.quantity * unitCost
                  });
                }
              }
              return [...otherRows, ...newRows];
            });
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleHideSelectionChange = (itemId: string, hideId: string, checked: boolean) => {
    const item = saleItems.find((i) => i.id === itemId);
    if (!item || !item.productId) return;
    const current = item.selectedHideIds || (item.selectedHideId ? [item.selectedHideId] : []);
    const next = checked ? (current.includes(hideId) ? current : [...current, hideId]) : current.filter((id) => id !== hideId);
    handleItemChange(itemId, 'selectedHideIds', next);
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

  const calculateTotalSaleAmount = () => {
    return (
      calculateSubtotalAfterItemDiscounts() -
      calculateOrderDiscount() +
      calculateEngravingTotal() +
      (Number(deliveryCost) || 0)
    );
  };

  const calculateTotal = () => {
    return calculateTotalSaleAmount();
  };

  const calculateHideCostTotal = () => {
    return linkedHides.reduce((total, row) => total + row.lineTotal, 0);
  };

  const calculateAdditionalCostLinesTotal = () => {
    return costLines.reduce((total, row) => total + row.lineTotal, 0);
  };

  const calculateCrafterLabourCost = () => {
    return (Number(numberOfHours) || 0) * (Number(hourlyFee) || 0);
  };

  const calculateEngravingChange = () => {
    return Math.max(calculateEngravingTotal() - (Number(engravingCoveredAmount) || 0), 0);
  };

  const calculateEngravingTotal = () => {
    return engravingRows.reduce((total, row) => {
      if (!row.enabled) return total;
      return total + (Number(row.amount) || 0);
    }, 0);
  };

  const calculateProductionCostTotal = () => {
    return (
      calculateHideCostTotal() +
      calculateAdditionalCostLinesTotal() +
      calculateCrafterLabourCost() +
      calculateEngravingTotal() +
      (Number(deliveryCost) || 0)
    );
  };

  const calculateFavourableSellingPrice = () => {
    return calculateProductionCostTotal() * ((Number(profitMarginPercentage) || 0) / 100);
  };

  const calculateExtraProfitOrLoss = () => {
    return calculateTotalSaleAmount() - calculateFavourableSellingPrice();
  };

  const calculateTotalUnits = () => {
    return saleItems.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
  };

  const calculateHidePricePerPiece = () => {
    const units = calculateTotalUnits();
    if (units <= 0) return 0;
    return calculateHideCostTotal() / units;
  };

  const calculateCraftMaterialsPricePerPiece = () => {
    const units = calculateTotalUnits();
    if (units <= 0) return 0;
    return calculateAdditionalCostLinesTotal() / units;
  };

  const deriveOrderStatusFromWorkflow = (): OrderStatus => {
    if (fulfillmentStatus === 'Remaining Amount Paid' || fulfillmentStatus === 'Delivered') {
      return 'Full Payment Done';
    }
    if (fulfillmentStatus !== 'Order Confirmed') {
      return 'Advance Paid';
    }
    // If an advance amount has been entered, treat as Advance Paid even
    // if the workflow dropdown hasn't been changed yet — this fires the
    // DB trigger that creates the finance record.
    if (advancePaymentAmount > 0) {
      return 'Advance Paid';
    }
    return 'Order Confirmed';
  };

  const calculateAdvancePayment = () => {
    return Number(advancePaymentAmount) || 0;
  };

  const calculateRemainingBalance = () => {
    return Math.max(calculateTotal() - calculateAdvancePayment(), 0);
  };

  const generatePDF = async (orderId: string, orderDate: string) => {
    const doc = new jsPDF();
    const logoDataUrl = await loadLogoDataUrl();
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
      additionalCosts: Number(calculateEngravingTotal() || 0),
      deliveryCost: Number(deliveryCost || 0),
      advancePayment: calculateAdvancePayment(),
      remainingBalance: calculateRemainingBalance(),
      logoDataUrl
    });

    doc.save(`Bumble_Studio_Invoice_${orderId.substring(0, 8)}.pdf`);
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
      const logoDataUrl = await loadLogoDataUrl();
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
        additionalCosts: Number(order.additional_costs || 0) + Number(order.packing_cost || 0),
        deliveryCost: Number(order.delivery_cost || 0),
        advancePayment: Number(order.advance_payment_amount || 0),
        remainingBalance: Number(order.remaining_balance || 0),
        logoDataUrl
      });

      doc.save(`Bumble_Studio_Invoice_${order.order_number}.pdf`);
      toast.success('PDF invoice generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const workflowStatuses: FulfillmentStatus[] = WORKFLOW_ORDER;

  const exportAllOrdersToExcel = () => {
    try {
      const rows = existingOrders.map((order) => {
        const totalAmount = Number(order.total_amount || 0);
        const productionCost = Number(order.production_cost_total || 0);
        const favourableSellingPrice = Number(order.favourable_selling_price || 0);
        const extraProfitOrLoss = Number(order.extra_profit_or_loss || (totalAmount - favourableSellingPrice));
        return {
          'Order Number': order.order_number,
          'Order Source': order.order_source || 'manual',
          'Fulfillment Status': order.status || '',
          'Customer Name': order.customer_name || '',
          'Telephone': order.customer_telephone || '',
          'Address': order.customer_address || '',
          'Order Date': order.order_date ? new Date(order.order_date).toLocaleString() : '',
          'Total Amount': totalAmount,
          'Advance Payment %': Number(order.advance_payment_percentage || 0),
          'Advance Payment Amount': Number(order.advance_payment_amount || 0),
          'Remaining Balance': Number(order.remaining_balance || 0),
          'Order Discount %': Number(order.discount_percentage || 0),
          'Order Discount Amount': Number(order.discount_amount || 0),
          'Engraving Expense': Number(order.additional_costs || 0),
          'Engraving Covered Amount': Number(order.engraving_covered_amount || 0),
          'Engraving Change Income': Number(order.engraving_change_income || 0),
          'Packing Price': Number(order.packing_cost || 0),
          'Delivery Cost': Number(order.delivery_cost || 0),
          'Hours': Number(order.number_of_hours || 0),
          'Hourly Rate': Number(order.hourly_fee || 0),
          'Crafter Labour Cost': Number(order.crafter_labour_cost || 0),
          'Production Cost Total': productionCost,
          'Profit Margin %': Number(order.profit_margin_percentage || 0),
          'Favourable Selling Price': favourableSellingPrice,
          'Extra Profit/Loss': extraProfitOrLoss,
          'Estimated Gross Profit': totalAmount - productionCost,
          'Notes': order.notes || '',
        };
      });

      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Sales Orders');
      XLSX.writeFile(book, 'sales_orders_full_export.xlsx');
      toast.success('All sales orders exported to Excel');
    } catch (error) {
      console.error('Error exporting all sales orders:', error);
      toast.error('Failed to export all sales orders');
    }
  };

  const exportOrderToExcel = async (orderId: string) => {
    try {
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (orderError || !order) throw orderError || new Error('Order not found');

      const { data: orderItems } = await supabase
        .from('sales_order_items')
        .select('*')
        .eq('sales_order_id', orderId);
      const { data: hideRows } = await (supabase as any)
        .from('sales_order_hides')
        .select('*')
        .eq('sales_order_id', orderId);
      const { data: costRows } = await (supabase as any)
        .from('sales_order_cost_lines')
        .select('*')
        .eq('sales_order_id', orderId);

      const infoSheetRows = [
        { Field: 'Order Number', Value: order.order_number },
        { Field: 'Order Source', Value: order.order_source || 'manual' },
        { Field: 'Fulfillment Status', Value: order.status || '' },
        { Field: 'Order Date', Value: order.order_date ? new Date(order.order_date).toLocaleString() : '' },
        { Field: 'Customer Name', Value: order.customer_name || '' },
        { Field: 'Customer Telephone', Value: order.customer_telephone || '' },
        { Field: 'Customer Address', Value: order.customer_address || '' },
        { Field: 'Total Amount', Value: Number(order.total_amount || 0) },
        { Field: 'Advance Payment %', Value: Number(order.advance_payment_percentage || 0) },
        { Field: 'Advance Payment Amount', Value: Number(order.advance_payment_amount || 0) },
        { Field: 'Remaining Balance', Value: Number(order.remaining_balance || 0) },
        { Field: 'Order Discount %', Value: Number(order.discount_percentage || 0) },
        { Field: 'Order Discount Amount', Value: Number(order.discount_amount || 0) },
        { Field: 'Engraving Expense', Value: Number(order.additional_costs || 0) },
        { Field: 'Engraving Covered Amount', Value: Number(order.engraving_covered_amount || 0) },
        { Field: 'Engraving Change Income', Value: Number(order.engraving_change_income || 0) },
        { Field: 'Packing Price', Value: Number(order.packing_cost || 0) },
        { Field: 'Delivery Cost', Value: Number(order.delivery_cost || 0) },
        { Field: 'Hours', Value: Number(order.number_of_hours || 0) },
        { Field: 'Hourly Rate', Value: Number(order.hourly_fee || 0) },
        { Field: 'Crafter Labour Cost', Value: Number(order.crafter_labour_cost || 0) },
        { Field: 'Production Cost Total', Value: Number(order.production_cost_total || 0) },
        { Field: 'Profit Margin %', Value: Number(order.profit_margin_percentage || 0) },
        { Field: 'Favourable Selling Price', Value: Number(order.favourable_selling_price || 0) },
        { Field: 'Extra Profit/Loss', Value: Number(order.extra_profit_or_loss || 0) },
      ];

      const itemRows = (orderItems || []).map((item: any) => ({
        'Inventory Item ID': item.inventory_item_id || item.product_id || '',
        'Variant ID': item.variant_item_id || '',
        Quantity: Number(item.quantity || 0),
        'Unit Price': Number(item.unit_price || 0),
        Discount: Number(item.discount || 0),
        'Line Total': Number(item.total_price || 0),
      }));

      const hideSheetRows = (hideRows || []).map((row: any) => ({
        'Hide ID': row.hide_id || '',
        'Selling Item ID': row.product_id || '',
        Quantity: Number(row.quantity || 0),
        'Man Hours': Number(row.man_hours || 0),
        'Hide Cost Per Piece': Number(row.unit_cost_per_product || 0),
        'Hide Cost': Number(row.line_total || 0),
      }));

      const costSheetRows = (costRows || []).map((row: any) => ({
        Type: row.item_type || '',
        'Inventory Item ID': row.inventory_item_id || '',
        Description: row.description || '',
        Quantity: Number(row.quantity || 0),
        'Unit Cost': Number(row.unit_cost || 0),
        'Line Total': Number(row.line_total || 0),
      }));

      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(infoSheetRows), 'Order Summary');
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(itemRows), 'Sale Items');
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(hideSheetRows), 'Hide Details');
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(costSheetRows), 'Craft Costs');

      XLSX.writeFile(book, `sales_order_${order.order_number}_full.xlsx`);
      toast.success('Sales order exported to Excel');
    } catch (error) {
      console.error('Error exporting order to Excel:', error);
      toast.error('Failed to export sales order');
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
        order_status: deriveOrderStatusFromWorkflow(),
        discount_percentage: discountPercentage,
        discount_amount: calculateOrderDiscount(),
        advance_payment_percentage: 0,
        advance_payment_amount: calculateAdvancePayment(),
        remaining_balance: calculateRemainingBalance(),
        subtotal_amount: calculateSubtotal(),
        additional_costs: calculateEngravingTotal(),
        engraving_covered_amount: engravingCoveredAmount,
        engraving_change_income: calculateEngravingChange(),
        packing_cost: 0,
        delivery_cost: deliveryCost,
        number_of_hours: numberOfHours,
        hourly_fee: hourlyFee,
        crafter_labour_cost: calculateCrafterLabourCost(),
        production_cost_total: calculateProductionCostTotal(),
        profit_margin_percentage: profitMarginPercentage,
        favourable_selling_price: calculateFavourableSellingPrice(),
        extra_profit_or_loss: calculateExtraProfitOrLoss(),
        total_amount: calculateTotal(),
        order_date: new Date().toISOString(),
        order_source: 'manual',
        status: fulfillmentStatus,
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

        const { error: deleteHidesError } = await (supabase as any)
          .from('sales_order_hides')
          .delete()
          .eq('sales_order_id', editingOrderId);
        if (deleteHidesError) throw deleteHidesError;

        const { error: deleteCostLinesError } = await (supabase as any)
          .from('sales_order_cost_lines')
          .delete()
          .eq('sales_order_id', editingOrderId);
        if (deleteCostLinesError) throw deleteCostLinesError;
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
        variant_item_id: null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount,
        total_price: (item.quantity * item.unitPrice) - (item.discount || 0)
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems);
      if (itemsError) throw itemsError;

      const hidePayloadFromItems: { sales_order_id: string; hide_id: string; product_id: string; quantity: number; man_hours: number; unit_cost_per_product: number; line_total: number }[] = [];
      for (const item of validItems) {
        const hideIds = item.selectedHideIds && item.selectedHideIds.length > 0
          ? item.selectedHideIds
          : (item.selectedHideId ? [item.selectedHideId] : []);
        for (const hideId of hideIds) {
          if (!hideId || !item.productId) continue;
          const hide = availableHides.find((h) => h.id === hideId);
          const unitCost = hide?.costPerProduct ?? 0;
          const linkedRow = linkedHides.find((r) => r.productId === item.productId && r.hideId === hideId);
          hidePayloadFromItems.push({
            sales_order_id: orderId,
            hide_id: hideId,
            product_id: item.productId,
            quantity: item.quantity,
            man_hours: linkedRow?.manHours ?? 0,
            unit_cost_per_product: linkedRow?.unitCostPerProduct ?? unitCost,
            line_total: (linkedRow?.unitCostPerProduct ?? unitCost) * item.quantity
          });
        }
      }
      const hidePayloadManual = linkedHides
        .filter((hide) => hide.hideId && hide.quantity > 0 && !hidePayloadFromItems.some((h) => h.product_id === hide.productId && h.hide_id === hide.hideId))
        .map((hide) => ({
          sales_order_id: orderId,
          hide_id: hide.hideId,
          product_id: hide.productId || null,
          quantity: hide.quantity,
          man_hours: hide.manHours,
          unit_cost_per_product: hide.unitCostPerProduct,
          line_total: hide.lineTotal
        }));
      const hidePayload = [...hidePayloadFromItems, ...hidePayloadManual];
      if (hidePayload.length > 0) {
        const { error: hideInsertError } = await (supabase as any)
          .from('sales_order_hides')
          .insert(hidePayload);
        if (hideInsertError) throw hideInsertError;
      }

      const materialCostLinePayload = costLines
        .filter((line) => line.quantity > 0 && line.inventoryItemId)
        .map((line) => ({
          sales_order_id: orderId,
          item_type: 'MATERIAL',
          inventory_item_id: line.inventoryItemId,
          description: craftingItems.find((item) => item.id === line.inventoryItemId)?.name || 'Craft material',
          quantity: line.quantity,
          unit_cost: line.unitCost,
          line_total: line.lineTotal
        }));

      const engravingCostLinePayload = engravingRows
        .filter((line) => line.enabled && Number(line.amount) > 0)
        .map((line) => ({
          sales_order_id: orderId,
          item_type: 'CUSTOM',
          inventory_item_id: null,
          description: line.text.trim() || 'Engraving',
          quantity: 1,
          unit_cost: Number(line.amount) || 0,
          line_total: Number(line.amount) || 0
        }));

      const costLinePayload = [...materialCostLinePayload, ...engravingCostLinePayload];
      if (costLinePayload.length > 0) {
        const { error: costLinesInsertError } = await (supabase as any)
          .from('sales_order_cost_lines')
          .insert(costLinePayload);
        if (costLinesInsertError) throw costLinesInsertError;
      }

      // Note: Financial transactions and stock reduction are now handled by database trigger
      // The trigger automatically creates/updates financial records based on order_status:
      // - Order Confirmed: Amount = 0
      // - Advance Paid: Amount = advance_payment_amount
      // - Full Payment Done: Amount = total_amount
      // Engraving is included in the sales order total - no separate transaction is created.

      toast.success(editingOrderId ? 'Sales order updated successfully!' : 'Sales order created successfully!');
      setShowForm(false);
      resetForm();
      await loadExistingOrders();
    } catch (error) {
      console.error('Error creating sales order:', error);
      toast.error('Failed to create sales order: ' + (error as Error).message);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/sales')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Manual Sales Orders</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Manage and create manual sales orders</p>
              </div>
            </div>
            {!showForm && (
              <div className="flex w-full sm:w-auto gap-2">
                <Button variant="outline" onClick={exportAllOrdersToExcel} className="w-full sm:w-auto">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export All Excel
                </Button>
                <Button onClick={() => {
                  resetForm();
                  setShowForm(true);
                }} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sales Order
                </Button>
              </div>
            )}
            {showForm && (
              <Button onClick={handleCreateOrder} size="lg" className="w-full sm:w-auto">
                {editingOrderId ? 'Update Order' : 'Create Order'}
              </Button>
            )}
          </div>

          {!showForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Sales Orders</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-0 md:min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Image</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingOrders ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                          Loading orders...
                        </TableCell>
                      </TableRow>
                    ) : existingOrders.length > 0 ? (
                      existingOrders.map(order => (
                        <TableRow
                          key={order.id}
                          data-mobile-clickable="true"
                          className="cursor-pointer"
                          onClick={() => handleEditOrder(order.id)}
                        >
                          <TableCell>
                            {order.first_item_image ? (
                              <img
                                src={order.first_item_image}
                                alt="Item"
                                className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg?height=40&width=40';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded flex items-center justify-center">
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{order.order_number}</TableCell>
                          <TableCell className="text-sm">{order.customer_name || 'Walk-in Customer'}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <Badge className="text-xs">{order.status || 'Order Confirmed'}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">Rs {Number(order.total_amount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <Button variant="ghost" size="sm" onClick={(e) => {
                                e.stopPropagation();
                                generatePDFForOrder(order.id);
                              }} className="h-8 w-8 p-0">
                                <FileDown className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => {
                                e.stopPropagation();
                                exportOrderToExcel(order.id);
                              }} className="h-8 w-8 p-0">
                                <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => {
                                e.stopPropagation();
                                handleEditOrder(order.id);
                              }} className="hidden md:inline-flex h-8 w-8 p-0">
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrder(order.id);
                              }} className="h-8 w-8 p-0">
                                <Trash className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                          No sales orders found. Click "Add Sales Order" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {showForm && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="w-full sm:w-auto"
              >
                Back to List
              </Button>
            </div>
          )}

          {showForm && (
            <div className="flex gap-2">
              <Button
                variant={activeDetailsTab === 'sale' ? 'default' : 'outline'}
                onClick={() => setActiveDetailsTab('sale')}
                className="flex-1 sm:flex-none"
              >
                Sale Details
              </Button>
              <Button
                variant={activeDetailsTab === 'craft' ? 'default' : 'outline'}
                onClick={() => setActiveDetailsTab('craft')}
                className="flex-1 sm:flex-none"
              >
                Craft Details
              </Button>
            </div>
          )}

          {showForm && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Order Items - Main Section */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{activeDetailsTab === 'sale' ? 'Sale Details' : 'Craft Details'}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-hidden">
                {activeDetailsTab === 'sale' && (
                <>
                <div className="min-w-0 md:min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead className="w-[50px]">Image</TableHead>
                      <TableHead className="min-w-[150px]">Item</TableHead>
                      <TableHead className="min-w-[180px]">Leather Hide</TableHead>
                      <TableHead className="w-[80px]">Quantity</TableHead>
                    <TableHead className="w-[100px]">Unit Price (Rs)</TableHead>
                      <TableHead className="w-[80px]">Discount</TableHead>
                      <TableHead className="w-[100px]">Total</TableHead>
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
                            <GripVertical className="hidden md:block h-4 w-4 text-muted-foreground" />
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
                                    <div className="flex items-center gap-2">
                                      {sellingItem.imageUrl ? (
                                        <img src={sellingItem.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                      ) : (
                                        <div className="w-8 h-8 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                                          <Package className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div className="flex flex-col min-w-0">
                                        <span className="truncate">{sellingItem.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          Rs {sellingItem.sellingPrice || 0}
                                          {sellingItem.discountPercentage ? ` | ${sellingItem.discountPercentage}% OFF` : ''}
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between font-normal h-10">
                                  <span className="truncate flex-1 text-left">
                                    {(item.selectedHideIds && item.selectedHideIds.length > 0)
                                      ? item.selectedHideIds
                                          .map((hid) => availableHides.find((h) => h.id === hid)?.hideName)
                                          .filter(Boolean)
                                          .join(', ')
                                      : 'Select hides'}
                                  </span>
                                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[280px] p-2" align="start">
                                <div className="max-h-[240px] overflow-y-auto space-y-2">
                                  {availableHides.map((hide) => {
                                    const checked = (item.selectedHideIds || (item.selectedHideId ? [item.selectedHideId] : [])).includes(hide.id);
                                    return (
                                      <label
                                        key={hide.id}
                                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={(c) => handleHideSelectionChange(item.id, hide.id, !!c)}
                                        />
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          {hide.imageUrls?.[0] ? (
                                            <img src={hide.imageUrls[0]} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                                          ) : (
                                            <div className="w-8 h-8 bg-muted rounded flex-shrink-0" />
                                          )}
                                          <span className="text-sm truncate">
                                            {hide.hideName} · {hide.animalType} · {hide.leatherGrain || '-'} · {hide.finishing}
                                          </span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full md:w-20"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full md:w-28 text-left md:text-right"
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
                </div>
                <div className="mt-4">
                  <Button variant="outline" onClick={handleAddItem} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                </>
                )}

                {activeDetailsTab === 'craft' && (
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Hide Details (Selected Hide, Hide Cost, Hide Cost Per Piece)</h3>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddHide}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Hide
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {linkedHides.map((hide) => (
                      <div key={hide.id} className="grid grid-cols-1 md:grid-cols-7 gap-2 border rounded-md p-3">
                        <Select value={hide.hideId} onValueChange={(value) => handleHideChange(hide.id, { hideId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Available Hide" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableHides.map((h) => (
                              <SelectItem key={h.id} value={h.id}>
                                <div className="flex items-center gap-2">
                                  {h.imageUrls?.[0] ? (
                                    <img src={h.imageUrls[0]} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                  ) : (
                                    <div className="w-8 h-8 bg-muted rounded flex-shrink-0" />
                                  )}
                                  <span className="truncate">{h.hideName}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={hide.productId} onValueChange={(value) => handleHideChange(hide.id, { productId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selling Item" />
                          </SelectTrigger>
                          <SelectContent>
                            {saleItems
                              .filter((line) => line.productId)
                              .map((line) => {
                                const invItem = sellingItems.find(s => s.id === line.productId);
                                return (
                                  <SelectItem key={`${hide.id}-${line.id}`} value={line.productId}>
                                    <div className="flex items-center gap-2">
                                      {invItem?.imageUrl ? (
                                        <img src={invItem.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                      ) : (
                                        <div className="w-8 h-8 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                                          <Package className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      )}
                                      <span className="truncate">{line.name}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Qty"
                          value={hide.quantity}
                          onChange={(e) => handleHideChange(hide.id, { quantity: parseFloat(e.target.value) || 0 })}
                        />

                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Man hours"
                          value={hide.manHours}
                          onChange={(e) => handleHideChange(hide.id, { manHours: parseFloat(e.target.value) || 0 })}
                        />

                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Hide cost per piece"
                          value={hide.unitCostPerProduct}
                          onChange={(e) => handleHideChange(hide.id, { unitCostPerProduct: parseFloat(e.target.value) || 0 })}
                        />

                        <Input type="number" value={hide.lineTotal.toFixed(2)} disabled placeholder="Hide cost" />

                        <Button type="button" variant="ghost" onClick={() => handleRemoveHide(hide.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {linkedHides.length === 0 && (
                      <p className="text-xs text-muted-foreground">Add one or more hides used for this order.</p>
                    )}
                  </div>
                </div>
                )}

                {activeDetailsTab === 'craft' && (
                <div className="mt-6 border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Craft Materials</h3>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddCostLine}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Craft Material
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {costLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-1 md:grid-cols-7 gap-2 border rounded-md p-3">
                        <Select value={line.inventoryItemId} onValueChange={(value) => handleCostLineChange(line.id, { inventoryItemId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select craft material" />
                          </SelectTrigger>
                          <SelectContent>
                            {craftingItems.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                <div className="flex items-center gap-2">
                                  {material.imageUrl ? (
                                    <img src={material.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                  ) : (
                                    <div className="w-8 h-8 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <span className="truncate">{material.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Quantity"
                          value={line.quantity}
                          onChange={(e) => handleCostLineChange(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                        />

                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Cost per piece"
                          value={line.unitCost}
                          onChange={(e) => handleCostLineChange(line.id, { unitCost: parseFloat(e.target.value) || 0 })}
                        />

                        <Input type="number" value={line.lineTotal.toFixed(2)} disabled />

                        <Button type="button" variant="ghost" onClick={() => handleRemoveCostLine(line.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {costLines.length === 0 && (
                      <p className="text-xs text-muted-foreground">Add one or more craft materials used for this order.</p>
                    )}
                  </div>
                </div>
                )}

                {activeDetailsTab === 'craft' && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Labour Costing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="mb-1 block">Number of hours</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={numberOfHours}
                        onChange={(e) => setNumberOfHours(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">Hourly fee (Rs)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={hourlyFee}
                        onChange={(e) => setHourlyFee(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">Crafter labour (Rs)</Label>
                      <Input type="number" value={calculateCrafterLabourCost().toFixed(2)} disabled />
                    </div>
                  </div>
                </div>
                )}

                {activeDetailsTab === 'craft' && (
                <div className="mt-6 border-t pt-4 space-y-3 text-xs sm:text-sm">
                  <h3 className="text-sm font-semibold">Business Amounts</h3>
                  <p className="text-muted-foreground">Price Break down (for reference purpose)</p>

                  <div className="grid grid-cols-[190px_1fr] items-center gap-3">
                    <span>Hide Price per piece</span>
                    <span>Rs {calculateHidePricePerPiece().toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-[190px_1fr] items-center gap-3">
                    <span>Craft materials price per piece</span>
                    <span>Rs {calculateCraftMaterialsPricePerPiece().toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-[190px_1fr] items-center gap-3">
                    <span>Profit Margin</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={profitMarginPercentage}
                        onChange={(e) => setProfitMarginPercentage(parseFloat(e.target.value) || 0)}
                        className="w-24 h-8"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[190px_1fr] items-center gap-3">
                    <span>Favourable Selling Price</span>
                    <span>Rs {calculateFavourableSellingPrice().toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-[190px_1fr] items-center gap-3">
                    <span>Extra Profit / Loss</span>
                    <span className={calculateExtraProfitOrLoss() >= 0 ? 'text-green-600' : 'text-destructive'}>
                      Rs {calculateExtraProfitOrLoss().toFixed(2)}
                    </span>
                  </div>
                </div>
                )}

                {/* Sales Amounts */}
                {activeDetailsTab === 'sale' && (
                <div className="mt-6 border-t pt-4 space-y-3 text-xs sm:text-sm">
                  <h3 className="text-sm font-semibold">Sales Amounts</h3>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <span>Item Price</span>
                    <span className="font-medium">Rs {calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <span>Delivery</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={deliveryCost}
                        onChange={(e) => setDeliveryCost(parseFloat(e.target.value) || 0)}
                        className="w-36 h-8"
                        placeholder="0.00"
                      />
                      <span>Rs</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <span>Engraving</span>
                    <div className="space-y-2">
                      <Button type="button" variant="outline" size="sm" onClick={addEngravingRow}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Engraving
                      </Button>
                      {engravingRows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => updateEngravingRow(row.id, { enabled: e.target.checked })}
                            className="h-4 w-4"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updateEngravingRow(row.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="w-24 h-8"
                          />
                          <Input
                            type="text"
                            value={row.text}
                            onChange={(e) => updateEngravingRow(row.id, { text: e.target.value })}
                            placeholder="What to engrave"
                            className="w-56 h-8"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEngravingRow(row.id)}
                            disabled={engravingRows.length <= 1}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <div className="text-xs text-muted-foreground">
                        Engraving Total: Rs {calculateEngravingTotal().toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <span>Discount</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                        className="w-24 h-8"
                      />
                      <span>%</span>
                      <span>-Rs {calculateOrderDiscount().toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3 border-t pt-3">
                    <span className="font-semibold">Total Selling price</span>
                    <span className="font-semibold">Rs {calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3 pt-1">
                    <span>Advance Payment</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={advancePaymentAmount}
                        onChange={(e) => setAdvancePaymentAmount(parseFloat(e.target.value) || 0)}
                        className="w-36 h-8"
                        placeholder="0.00"
                      />
                      <span className="text-sm text-muted-foreground">Rs</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="text-muted-foreground">Rs {calculateRemainingBalance().toFixed(2)}</span>
                  </div>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Details - Sidebar */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                    <Label htmlFor="customerName">Name</Label>
                    <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-[110px_1fr] items-start gap-3">
                    <Label htmlFor="customerAddress" className="pt-2">Address</Label>
                    <Textarea id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} />
                  </div>

                  <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                    <Label htmlFor="customerTelephone">Telephone</Label>
                    <Input id="customerTelephone" value={customerTelephone} onChange={(e) => setCustomerTelephone(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Status Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                    <Label htmlFor="fulfillmentStatus">Workflow</Label>
                    <Select value={fulfillmentStatus} onValueChange={(value) => setFulfillmentStatus(value as FulfillmentStatus)}>
                      <SelectTrigger id="fulfillmentStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {workflowStatuses.map((statusValue) => (
                          <SelectItem key={statusValue} value={statusValue}>
                            {statusValue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

          </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ManualSalesOrder;
