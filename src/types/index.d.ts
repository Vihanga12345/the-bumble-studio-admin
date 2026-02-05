export interface Customer {
  id: string;
  name: string;
  telephone: string;
  address: string;
  email: string;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  telephone: string;
  address: string;
  paymentTerms: string;
  createdAt: Date;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'completed' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier: Supplier;
  items: PurchaseItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export type UnitOfMeasure = 'pieces' | 'kg' | 'liters' | 'meters' | 'units' | 'box' | 'pair';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  unitOfMeasure: UnitOfMeasure;
  purchaseCost: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  sku: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isVariant?: boolean;
  parentItemId?: string | null;
  variantName?: string;
}

export interface InventoryAdjustment {
  id: string;
  itemId: string;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  notes: string;
  date: Date;
  createdBy: string;
}

export type PaymentMethod = 'cash' | 'card' | 'bank' | 'check' | 'other';
export type TransactionType = 'income' | 'expense';



export interface SalesOrder {
  id: string;
  customerId: string;
  customer: Customer;
  orderNumber: string;
  items: SaleItem[];
  status: 'pending' | 'completed' | 'cancelled';
  orderDate: Date;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  product: InventoryItem;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  salesOrderId: string;
  invoiceNumber: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: Date;
  paidAt?: Date;
}

export interface ReportFilter {
  startDate: Date;
  endDate: Date;
  category?: string;
  customerId?: string;
  productId?: string;
  supplierId?: string;
  status?: string;
}

export interface DashboardSummary {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  topSellingItems: {
    itemId: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  lowStockItems: {
    itemId: string;
    name: string;
    currentStock: number;
    reorderLevel: number;
  }[];
  recentTransactions: Transaction[];
}

export interface SalesReport {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  salesByProduct: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  salesByCustomer: {
    customerId: string;
    customerName: string;
    orderCount: number;
    totalAmount: number;
  }[];
  salesByDate: {
    date: string;
    amount: number;
  }[];
}

export interface InventoryReport {
  totalItems: number;
  totalValue: number;
  items: {
    id: string;
    name: string;
    category: string;
    currentStock: number;
    value: number;
  }[];
  recentAdjustments: InventoryAdjustment[];
}

export interface FinancialReport {
  income: number;
  expenses: number;
  netProfit: number;
  expensesByCategory: {
    category: string;
    amount: number;
  }[];
  cashFlow: {
    date: string;
    income: number;
    expenses: number;
    net: number;
  }[];
}
