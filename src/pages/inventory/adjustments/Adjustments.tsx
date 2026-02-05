import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInventory } from '@/hooks/useInventory';
import { AdjustmentReason } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, Package } from 'lucide-react';

const reasonOptions = [
  { value: 'damage', label: 'Damage' },
  { value: 'counting_error', label: 'Counting Error' },
  { value: 'return', label: 'Return' },
  { value: 'theft', label: 'Theft' },
  { value: 'other', label: 'Other' }
];

const Adjustments = () => {
  const navigate = useNavigate();
  const { items, createInventoryAdjustment, adjustments, fetchAdjustments } = useInventory();
  
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantityChange, setQuantityChange] = useState('');
  const [reason, setReason] = useState<AdjustmentReason>('counting_error');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItemId) {
      toast.error('Please select an item');
      return;
    }
    
    const changeValue = parseInt(quantityChange);
    
    if (isNaN(changeValue)) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const item = items.find(item => item.id === selectedItemId);
      if (!item) throw new Error('Item not found');
      
      const previousQuantity = item.currentStock;
      const newQuantity = previousQuantity + changeValue;
      
      if (newQuantity < 0) {
        toast.error('Adjustment would result in negative stock');
        setIsLoading(false);
        return;
      }
      
      await createInventoryAdjustment(
        selectedItemId,
        previousQuantity,
        newQuantity,
        reason,
        notes
      );
      
      toast.success('Stock adjusted successfully');
      
      // Reset form
      setSelectedItemId('');
      setQuantityChange('');
      setReason('counting_error');
      setNotes('');
      
      // Refresh adjustments
      await fetchAdjustments();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const refreshData = async () => {
    setIsLoading(true);
    try {
      await fetchAdjustments();
      toast.success('Adjustments refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Stock Adjustments</h1>
              <p className="text-muted-foreground">Manage inventory level corrections and adjustments</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>Adjust Stock</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="item">Select Item</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger id="item">
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} (Current: {item.currentStock} {item.unitOfMeasure})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedItemId && (() => {
                    const selectedItem = items.find(item => item.id === selectedItemId);
                    return selectedItem ? (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        {selectedItem.imageUrl ? (
                          <img 
                            src={selectedItem.imageUrl} 
                            alt={selectedItem.name}
                            className="w-16 h-16 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg?height=64&width=64';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-background rounded flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{selectedItem.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Current: {selectedItem.currentStock} {selectedItem.unitOfMeasure}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantityChange">Quantity Change</Label>
                    <Input
                      id="quantityChange"
                      type="number"
                      placeholder="Enter quantity (positive or negative)"
                      value={quantityChange}
                      onChange={(e) => setQuantityChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use positive numbers to add stock, negative to remove.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Select value={reason} onValueChange={(value) => setReason(value as AdjustmentReason)}>
                      <SelectTrigger id="reason">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {reasonOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add additional details or reference numbers"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : 'Adjust Stock'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Adjustment History</CardTitle>
                <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.length > 0 ? (
                      adjustments.map(adjustment => (
                        <TableRow key={adjustment.id}>
                          <TableCell>{adjustment.adjustmentDate.toLocaleDateString()}</TableCell>
                          <TableCell>{adjustment.item.name}</TableCell>
                          <TableCell>
                            <span className={adjustment.newQuantity > adjustment.previousQuantity ? 'text-green-600' : 'text-red-600'}>
                              {adjustment.newQuantity > adjustment.previousQuantity ? '+' : ''}
                              {adjustment.newQuantity - adjustment.previousQuantity} {adjustment.item.unitOfMeasure}
                            </span>
                          </TableCell>
                          <TableCell className="capitalize">{adjustment.reason.replace('_', ' ')}</TableCell>
                          <TableCell>{adjustment.notes || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No adjustment history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Adjustments;
