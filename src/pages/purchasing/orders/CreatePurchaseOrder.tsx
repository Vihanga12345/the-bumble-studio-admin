
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, ArrowLeft, FileText } from 'lucide-react';
import { Supplier, PurchaseItem } from '@/types';
import { toast } from 'sonner';

// Mock suppliers data
const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'ABC Suppliers',
    telephone: '123-456-7890',
    address: '123 Main St, Anytown',
    paymentTerms: 'Net 30',
    createdAt: new Date('2023-01-01')
  },
  {
    id: '2',
    name: 'XYZ Electronics',
    telephone: '987-654-3210',
    address: '456 Market St, Othertown',
    paymentTerms: 'Net 15',
    createdAt: new Date('2023-02-01')
  },
  {
    id: '3',
    name: 'Office Supplies Co.',
    telephone: '555-123-4567',
    address: '789 Office Park, Businesstown',
    paymentTerms: 'Net 45',
    createdAt: new Date('2023-03-01')
  }
];

const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      id: '1',
      name: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0
    }
  ]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        name: '',
        quantity: 1,
        unitCost: 0,
        totalCost: 0
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    } else {
      toast.error('You must have at least one item in the purchase order');
    }
  };

  const handleItemChange = (id: string, field: keyof PurchaseItem, value: string | number) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total cost if quantity or unit cost changes
          if (field === 'quantity' || field === 'unitCost') {
            const quantity = field === 'quantity' ? Number(value) : item.quantity;
            const unitCost = field === 'unitCost' ? Number(value) : item.unitCost;
            updatedItem.totalCost = quantity * unitCost;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.totalCost, 0);
  };

  const handleCreateOrder = () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }

    const invalidItems = items.filter(item => !item.name || item.quantity <= 0 || item.unitCost <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please fill in all item details with valid quantities and costs');
      return;
    }

    // Here we would save the purchase order data
    console.log({
      supplier: selectedSupplier,
      items,
      notes,
      totalAmount: calculateTotal()
    });

    toast.success('Purchase Order created successfully');
    navigate('/purchasing/orders');
  };

  const handleExportPDF = () => {
    toast.info('PDF export functionality would be implemented here');
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/purchasing/orders')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
              <h1 className="text-3xl font-bold">Create Purchase Order</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
              <Button onClick={handleCreateOrder}>
                Create Order
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost (Rs)</TableHead>
                      <TableHead>Total (Rs)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            placeholder="Item name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => handleItemChange(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.totalCost.toFixed(2)}
                            disabled
                          />
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
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4">
                  <Button variant="outline" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t p-4">
                <div className="text-lg font-medium">Total</div>
                <div className="text-lg font-bold">Rs {calculateTotal().toFixed(2)}</div>
              </CardFooter>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Supplier Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Select Supplier</Label>
                      <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger id="supplier">
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockSuppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedSupplier && (
                      <div className="space-y-2 bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium">
                          {mockSuppliers.find(s => s.id === selectedSupplier)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {mockSuppliers.find(s => s.id === selectedSupplier)?.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tel: {mockSuppliers.find(s => s.id === selectedSupplier)?.telephone}
                        </p>
                        <p className="text-sm">
                          Payment Terms: {mockSuppliers.find(s => s.id === selectedSupplier)?.paymentTerms}
                        </p>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/purchasing/suppliers/new')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Supplier
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add any notes or special instructions for this order..."
                    className="min-h-[120px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreatePurchaseOrder;
