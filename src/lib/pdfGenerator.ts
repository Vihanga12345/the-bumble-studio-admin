import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder, SalesOrder } from '@/types';

// Company Information
const COMPANY_INFO = {
  name: 'The Bumble Studio',
  address: 'Ambalangoda, Sri Lanka',
  phone: '+94 0 00 000 000',
  email: 'info@thebumblestudio.com',
  website: 'www.thebumblestudio.com'
};

// PDF styling configuration
const PDF_CONFIG = {
  marginTop: 20,
  marginLeft: 20,
  marginRight: 20,
  lineHeight: 6,
  fontSize: {
    title: 20,
    subtitle: 14,
    header: 12,
    body: 10,
    small: 8
  },
  colors: {
    primary: [205, 160, 77] as [number, number, number], // Gold
    secondary: [74, 50, 33] as [number, number, number], // Leather brown
    accent: [140, 98, 57] as [number, number, number],   // Bronze
    text: [60, 45, 32] as [number, number, number],      // Deep brown
    light: [236, 228, 218] as [number, number, number]   // Light parchment
  }
};

const LOGO_URL = '/The Bumble Studio LOGO.png';

const INVOICE_TERMS = [
  '50% advanced payment needs to be made for order confirmation',
  'Remaining amount should be paid upon delivery.',
  'A payment receipt',
  'Delivery charges is only 500 LKR',
  'Payment needs to be made to below mentioned bank account'
];

const INVOICE_BANK_DETAILS = [
  'Account No: 076020269000',
  'Hatton National Bank',
  'HNB - CINNAMON GARDENS Branch',
  'JAYAMANNE M D V D'
];

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

export class PDFGenerator {
  private doc: jsPDF;
  private currentY: number = PDF_CONFIG.marginTop;

  constructor() {
    this.doc = new jsPDF();
    this.setupDocument();
  }

  private setupDocument(): void {
    this.doc.setFont('helvetica');
  }

  private addHeader(title: string, logoDataUrl?: string | null): void {
    const pageWidth = this.doc.internal.pageSize.width;
    
    // Company Logo Area (placeholder)
    this.doc.setFillColor(...PDF_CONFIG.colors.secondary);
    this.doc.rect(PDF_CONFIG.marginLeft, this.currentY, pageWidth - 2 * PDF_CONFIG.marginLeft, 25, 'F');
    
    // Company Name
    this.doc.setTextColor(...PDF_CONFIG.colors.light);
    this.doc.setFontSize(PDF_CONFIG.fontSize.title);
    const nameX = logoDataUrl ? PDF_CONFIG.marginLeft + 30 : PDF_CONFIG.marginLeft + 10;
    this.doc.text(COMPANY_INFO.name, nameX, this.currentY + 15);

    if (logoDataUrl) {
      this.doc.addImage(logoDataUrl, 'PNG', PDF_CONFIG.marginLeft + 6, this.currentY + 4, 17, 17);
    }
    
    // Document Title
    this.doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
    const titleWidth = this.doc.getTextWidth(title);
    this.doc.text(title, pageWidth - PDF_CONFIG.marginRight - titleWidth - 10, this.currentY + 15);
    
    this.currentY += 35;
    
    this.currentY += 10;
  }

  private addSection(title: string, content: { [key: string]: string | number }, width: number = 80): void {
    // Section title
    this.doc.setFontSize(PDF_CONFIG.fontSize.header);
    this.doc.setTextColor(...PDF_CONFIG.colors.secondary);
    this.doc.text(title, PDF_CONFIG.marginLeft, this.currentY);
    this.currentY += 10;
    
    // Section content
    this.doc.setFontSize(PDF_CONFIG.fontSize.body);
    this.doc.setTextColor(...PDF_CONFIG.colors.text);
    
    Object.entries(content).forEach(([key, value]) => {
      this.doc.text(`${key}:`, PDF_CONFIG.marginLeft + 5, this.currentY);
      this.doc.text(String(value), PDF_CONFIG.marginLeft + width, this.currentY);
      this.currentY += PDF_CONFIG.lineHeight;
    });
    
    this.currentY += 5;
  }

  private addItemsTable(
    items: any[],
    columns: string[],
    headers: string[],
    currency: string = 'LKR'
  ): void {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('en-LK', { style: 'currency', currency }).format(value);
    const tableData = items.map(item => 
      columns.map(col => {
        const value = col.split('.').reduce((obj, key) => obj?.[key], item);
        if (typeof value === 'number' && (col.includes('cost') || col.includes('price') || col.includes('amount'))) {
          return formatCurrency(value);
        }
        return String(value || '');
      })
    );

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_CONFIG.colors.secondary,
        textColor: PDF_CONFIG.colors.light,
        fontSize: PDF_CONFIG.fontSize.body,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: PDF_CONFIG.fontSize.body,
        textColor: PDF_CONFIG.colors.text
      },
      alternateRowStyles: {
        fillColor: PDF_CONFIG.colors.light
      },
      margin: { left: PDF_CONFIG.marginLeft, right: PDF_CONFIG.marginRight },
      tableWidth: 'auto'
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addTotal(label: string, amount: number, currency: string = 'LKR'): void {
    const pageWidth = this.doc.internal.pageSize.width;
    this.doc.setFontSize(PDF_CONFIG.fontSize.header);
    this.doc.setTextColor(...PDF_CONFIG.colors.secondary);
    
    const totalText = `${label}: ${new Intl.NumberFormat('en-LK', { style: 'currency', currency }).format(amount)}`;
    const textWidth = this.doc.getTextWidth(totalText);
    
    this.doc.setFillColor(...PDF_CONFIG.colors.light);
    this.doc.rect(pageWidth - PDF_CONFIG.marginRight - textWidth - 20, this.currentY - 5, textWidth + 15, 15, 'F');
    
    this.doc.text(totalText, pageWidth - PDF_CONFIG.marginRight - textWidth - 10, this.currentY + 5);
    this.currentY += 20;
  }

  private addFooter(): void {
    const pageHeight = this.doc.internal.pageSize.height;
    const pageWidth = this.doc.internal.pageSize.width;
    
    // Footer line
    this.doc.setDrawColor(...PDF_CONFIG.colors.light);
    this.doc.line(PDF_CONFIG.marginLeft, pageHeight - 30, pageWidth - PDF_CONFIG.marginRight, pageHeight - 30);
    
    // Footer text
    this.doc.setFontSize(PDF_CONFIG.fontSize.small);
    this.doc.setTextColor(...PDF_CONFIG.colors.light);
    this.doc.text('Thank you for your business!', PDF_CONFIG.marginLeft, pageHeight - 20);
    
    // Page number and date
    const date = new Date().toLocaleDateString();
    const footerRight = `Generated on ${date} | Page 1`;
    const footerRightWidth = this.doc.getTextWidth(footerRight);
    this.doc.text(footerRight, pageWidth - PDF_CONFIG.marginRight - footerRightWidth, pageHeight - 20);
  }

  private openPrintPreview(filename: string): void {
    try {
      // Convert PDF to blob
      const pdfBlob = this.doc.output('blob');
      
      // Create URL for the blob
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open in new window for printing
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          // Auto-trigger print dialog after a short delay to ensure PDF loads
          setTimeout(() => {
            printWindow.print();
            
            // Optional: Also download the PDF
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL after some delay
            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
            }, 1000);
          }, 500);
        };
      } else {
        // Fallback: just download if popup blocked
        this.doc.save(filename);
      }
    } catch (error) {
      console.error('Error opening print preview:', error);
      // Fallback: just download
      this.doc.save(filename);
    }
  }

  // Generate Purchase Order PDF
  public async generatePurchaseOrderPDF(order: PurchaseOrder, showPrint: boolean = true): Promise<void> {
    const logoDataUrl = await loadLogoDataUrl();
    this.doc = new jsPDF();
    this.setupDocument();

    const pageWidth = this.doc.internal.pageSize.width;
    const leftX = PDF_CONFIG.marginLeft;
    const rightX = pageWidth - PDF_CONFIG.marginRight;
    const centerX = pageWidth / 2;
    const formatRs = (value: number) => `Rs ${value.toFixed(2)}`;

    let y = 15;
    if (logoDataUrl) {
      this.doc.addImage(logoDataUrl, 'PNG', centerX - 15, y, 30, 30);
      y += 35;
    } else {
      y += 5;
    }

    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(60, 45, 32);
    this.doc.text(COMPANY_INFO.name, centerX, y, { align: 'center' });
    y += 10;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('PURCHASE ORDER', centerX, y, { align: 'center' });
    y += 8;

    this.doc.setDrawColor(120, 120, 120);
    this.doc.setLineWidth(0.5);
    this.doc.line(leftX, y, rightX, y);
    y += 10;

    this.doc.setFontSize(10);
    this.doc.setTextColor(60, 45, 32);

    const supplierLines = [
      order.supplier.name,
      ...(order.supplier.address ? order.supplier.address.split(',').map(line => line.trim()).filter(Boolean) : []),
      order.supplier.telephone ? order.supplier.telephone : ''
    ].filter(Boolean);

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('SUPPLIER:', leftX, y);
    this.doc.text('ORDER NO:', rightX, y, { align: 'right' });
    y += 7;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(supplierLines, leftX, y);
    this.doc.text(order.orderNumber, rightX, y, { align: 'right' });
    y += Math.max(supplierLines.length * 6, 6);
    this.doc.text(new Date(order.createdAt).toLocaleDateString(), rightX, y, { align: 'right' });
    y += 10;

    this.doc.setDrawColor(120, 120, 120);
    this.doc.setLineWidth(0.3);
    this.doc.line(leftX, y, rightX, y);
    y += 8;

    autoTable(this.doc, {
      startY: y,
      head: [['DESCRIPTION', 'UNIT COST', 'QTY', 'TOTAL']],
      body: order.items.map(item => ([
        item.name,
        formatRs(item.unitCost),
        item.quantity.toString(),
        formatRs(item.totalCost)
      ])),
      theme: 'plain',
      headStyles: {
        textColor: [60, 45, 32],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 10,
        textColor: [60, 45, 32],
        cellPadding: 2
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      },
      margin: { left: leftX, right: PDF_CONFIG.marginRight }
    });

    const finalY = (this.doc as any).lastAutoTable.finalY + 6;
    this.doc.setLineWidth(0.3);
    this.doc.line(leftX, finalY, rightX, finalY);

    let totalsY = finalY + 10;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Total', rightX - 50, totalsY);
    this.doc.text(formatRs(order.totalAmount), rightX, totalsY, { align: 'right' });
    totalsY += 12;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    if (order.notes) {
      this.doc.setDrawColor(120, 120, 120);
      this.doc.line(leftX, totalsY, rightX, totalsY);
      totalsY += 8;
      this.doc.text('NOTES', leftX, totalsY);
      totalsY += 6;
      this.doc.text(order.notes, leftX, totalsY);
    }

    if (showPrint) {
      this.openPrintPreview(`The_Bumble_Studio_Purchase_Order_${order.orderNumber}.pdf`);
    } else {
      this.doc.save(`The_Bumble_Studio_Purchase_Order_${order.orderNumber}.pdf`);
    }
  }

  // Generate Sales Order PDF
  public async generateSalesOrderPDF(order: SalesOrder, showPrint: boolean = true): Promise<void> {
    const logoDataUrl = await loadLogoDataUrl();
    this.doc = new jsPDF();
    this.setupDocument();

    const pageWidth = this.doc.internal.pageSize.width;
    const leftX = PDF_CONFIG.marginLeft;
    const rightX = pageWidth - PDF_CONFIG.marginRight;
    const centerX = pageWidth / 2;

    const formatRs = (value: number) => `Rs ${value.toFixed(2)}`;

    let y = 15;
    if (logoDataUrl) {
      this.doc.addImage(logoDataUrl, 'PNG', centerX - 12, y, 24, 24);
      y += 28;
    }

    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(60, 45, 32);
    this.doc.text(COMPANY_INFO.name, centerX, y, { align: 'center' });
    y += 10;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('INVOICE', centerX, y, { align: 'center' });
    y += 8;

    this.doc.setDrawColor(120, 120, 120);
    this.doc.setLineWidth(0.5);
    this.doc.line(leftX, y, rightX, y);
    y += 10;

    this.doc.setFontSize(10);
    this.doc.setTextColor(60, 45, 32);

    const rawCustomerName = order.customer?.name || order.customerName || 'Customer';
    const customerName = rawCustomerName === 'Walk-in Customer' ? '' : rawCustomerName;
    const customerAddress = order.shippingAddress || order.customer?.address || 'Address not provided';
    const customerLines = [customerName, ...customerAddress.split(',').map(line => line.trim()).filter(Boolean)];

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ISSUED TO:', leftX, y);
    this.doc.text('ORDER NO:', rightX, y, { align: 'right' });
    y += 7;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(customerLines, leftX, y);
    this.doc.text(order.orderNumber, rightX, y, { align: 'right' });
    y += Math.max(customerLines.length * 6, 6);
    this.doc.text(new Date(order.orderDate).toLocaleDateString(), rightX, y, { align: 'right' });
    y += 10;

    this.doc.setDrawColor(120, 120, 120);
    this.doc.setLineWidth(0.3);
    this.doc.line(leftX, y, rightX, y);
    y += 8;

    const tableStartY = y;
    const tableBody = order.items.map(item => ([
      item.product?.name || 'Item',
      formatRs(item.unitPrice),
      item.quantity.toString(),
      formatRs(item.totalPrice)
    ]));

    autoTable(this.doc, {
      startY: tableStartY,
      head: [['DESCRIPTION', 'UNIT PRICE', 'QTY', 'TOTAL']],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        textColor: [60, 45, 32],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 10,
        textColor: [60, 45, 32],
        cellPadding: 2
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      },
      margin: { left: leftX, right: PDF_CONFIG.marginRight }
    });

    const finalY = (this.doc as any).lastAutoTable.finalY + 6;
    this.doc.line(leftX, finalY, rightX, finalY);

    // Calculate subtotal from items (without additional costs)
    const itemsSubtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const orderDiscount = (order as any).discountAmount || (order as any).discount_amount || 0;
    const additionalCosts = (order as any).additionalCosts || (order as any).additional_costs || 0;
    const deliveryCost = (order as any).deliveryCost || (order as any).delivery_cost || 0;
    
    let totalsY = finalY + 10;
    const totalsX = rightX;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    // Show subtotal
    this.doc.text('Subtotal', totalsX - 50, totalsY);
    this.doc.text(formatRs(itemsSubtotal), totalsX, totalsY, { align: 'right' });
    totalsY += 7;
    
    // Show order discount if present
    if (orderDiscount > 0) {
      this.doc.setTextColor(0, 128, 0);
      this.doc.text('Order Discount', totalsX - 50, totalsY);
      this.doc.text(`-${formatRs(orderDiscount)}`, totalsX, totalsY, { align: 'right' });
      this.doc.setTextColor(0, 0, 0);
      totalsY += 7;
    }
    
    // Show additional costs if present
    if (additionalCosts > 0) {
      this.doc.text('Additional Costs', totalsX - 50, totalsY);
      this.doc.text(formatRs(additionalCosts), totalsX, totalsY, { align: 'right' });
      totalsY += 7;
    }
    
    // Show delivery cost if present
    if (deliveryCost > 0) {
      this.doc.text('Delivery Cost', totalsX - 50, totalsY);
      this.doc.text(formatRs(deliveryCost), totalsX, totalsY, { align: 'right' });
      totalsY += 7;
    }
    
    // Draw line before total
    this.doc.setLineWidth(0.3);
    this.doc.line(totalsX - 70, totalsY, totalsX, totalsY);
    totalsY += 8;
    
    // Calculate and show total
    const totalAmount = itemsSubtotal - orderDiscount + additionalCosts + deliveryCost;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Total', totalsX - 50, totalsY);
    this.doc.text(formatRs(totalAmount), totalsX, totalsY, { align: 'right' });
    totalsY += 10;
    
    // Show advance payment and remaining balance
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const advancePayment = order.advancePaymentAmount ?? (totalAmount * 0.5);
    const amountDue = order.remainingBalance ?? (totalAmount - advancePayment);
    
    this.doc.text('Advance (50%)', totalsX - 50, totalsY);
    this.doc.text(formatRs(advancePayment), totalsX, totalsY, { align: 'right' });
    totalsY += 7;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Amount due', totalsX - 50, totalsY);
    this.doc.text(formatRs(amountDue), totalsX, totalsY, { align: 'right' });
    this.doc.setFont('helvetica', 'normal');
    totalsY += 15;

    // Add Terms & Conditions and Bank Details
    this.doc.setDrawColor(120, 120, 120);
    this.doc.setLineWidth(0.3);
    this.doc.line(leftX, totalsY, rightX, totalsY);
    totalsY += 8;

    // Terms & Conditions
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Terms & Conditions:', leftX, totalsY);
    totalsY += 6;

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    INVOICE_TERMS.forEach(term => {
      this.doc.text(`• ${term}`, leftX + 2, totalsY);
      totalsY += 5;
    });

    totalsY += 5;

    // Bank Details
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bank Details:', leftX, totalsY);
    totalsY += 6;

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    INVOICE_BANK_DETAILS.forEach(detail => {
      this.doc.text(detail, leftX + 2, totalsY);
      totalsY += 5;
    });

    if (showPrint) {
      this.openPrintPreview(`The_Bumble_Studio_Invoice_${order.orderNumber}.pdf`);
    } else {
      this.doc.save(`The_Bumble_Studio_Invoice_${order.orderNumber}.pdf`);
    }
  }

  // Generate POS Receipt PDF
  public generatePOSReceiptPDF(saleData: {
    receiptNumber: string;
    date: Date;
    items: any[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    cashier?: string;
  }, showPrint: boolean = true): void {
    // Use a smaller format for receipts
    this.doc = new jsPDF({
      format: [80, 200], // Receipt size
      unit: 'mm'
    });
    
    this.currentY = 10;
    const centerX = 40; // Center of receipt
    
    // Header
    this.doc.setFontSize(14);
    this.doc.setTextColor(...PDF_CONFIG.colors.primary);
    this.doc.text(COMPANY_INFO.name, centerX, this.currentY, { align: 'center' });
    this.currentY += 6;
    
    this.doc.setFontSize(8);
    this.doc.setTextColor(...PDF_CONFIG.colors.text);
    this.doc.text(COMPANY_INFO.address, centerX, this.currentY, { align: 'center' });
    this.currentY += 4;
    this.doc.text(COMPANY_INFO.phone, centerX, this.currentY, { align: 'center' });
    this.currentY += 8;
    
    // Receipt Info
    this.doc.setFontSize(10);
    this.doc.text(`Receipt: ${saleData.receiptNumber}`, 5, this.currentY);
    this.currentY += 4;
    this.doc.text(`Date: ${saleData.date.toLocaleDateString()}`, 5, this.currentY);
    this.currentY += 4;
    this.doc.text(`Time: ${saleData.date.toLocaleTimeString()}`, 5, this.currentY);
    if (saleData.cashier) {
      this.currentY += 4;
      this.doc.text(`Cashier: ${saleData.cashier}`, 5, this.currentY);
    }
    this.currentY += 8;
    
    // Items
    this.doc.setFontSize(8);
    this.doc.text('ITEMS', 5, this.currentY);
    this.currentY += 6;
    
    saleData.items.forEach(item => {
      // Item name
      this.doc.text(item.name, 5, this.currentY);
      this.currentY += 4;
      
      // Quantity x Price = Total
      const itemLine = `${item.quantity} x Rs ${item.unitPrice.toFixed(2)} = Rs ${item.totalPrice.toFixed(2)}`;
      this.doc.text(itemLine, 10, this.currentY);
      this.currentY += 6;
    });
    
    // Totals
    this.doc.setFontSize(9);
    this.currentY += 4;
    this.doc.text(`Subtotal: Rs ${saleData.subtotal.toFixed(2)}`, 5, this.currentY);
    this.currentY += 4;
    if (saleData.discount > 0) {
      this.doc.text(`Discount: -Rs ${saleData.discount.toFixed(2)}`, 5, this.currentY);
      this.currentY += 4;
    }
    if (saleData.tax > 0) {
      this.doc.text(`Tax: Rs ${saleData.tax.toFixed(2)}`, 5, this.currentY);
      this.currentY += 4;
    }
    
    // Final total
    this.doc.setFontSize(12);
    this.doc.setTextColor(...PDF_CONFIG.colors.primary);
    this.doc.text(`TOTAL: Rs ${saleData.total.toFixed(2)}`, 5, this.currentY);
    this.currentY += 6;
    
    // Payment method
    this.doc.setFontSize(9);
    this.doc.setTextColor(...PDF_CONFIG.colors.text);
    this.doc.text(`Payment: ${saleData.paymentMethod.toUpperCase()}`, 5, this.currentY);
    this.currentY += 8;
    
    // Footer
    this.doc.setFontSize(8);
    this.doc.text('Thank you for your business!', centerX, this.currentY, { align: 'center' });
    
    if (showPrint) {
      // Open print preview
      this.openPrintPreview(`receipt-${saleData.receiptNumber}.pdf`);
    } else {
      // Just download
      this.doc.save(`receipt-${saleData.receiptNumber}.pdf`);
    }
  }
}

// Export utility functions
export const generatePurchaseOrderPDF = async (order: PurchaseOrder, showPrint: boolean = true) => {
  const generator = new PDFGenerator();
  await generator.generatePurchaseOrderPDF(order, showPrint);
};

export const generateSalesOrderPDF = async (order: SalesOrder, showPrint: boolean = true) => {
  const generator = new PDFGenerator();
  await generator.generateSalesOrderPDF(order, showPrint);
};

export const generatePOSReceiptPDF = (saleData: any, showPrint: boolean = true) => {
  const generator = new PDFGenerator();
  generator.generatePOSReceiptPDF(saleData, showPrint);
}; 