
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadMultipleImages, validateImageFile, deleteMultipleImages } from '@/lib/uploadUtils';

const CreateTransaction = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'cash',
    referenceNumber: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    const maxImages = 5;
    const remainingSlots = maxImages - imageFiles.length;

    if (files.length > remainingSlots) {
      toast.error(`Can only upload ${remainingSlots} more image(s). Maximum ${maxImages} images per transaction.`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateImageFile(file, 10); // 10MB max
      if (!validation.isValid) {
        toast.error(validation.error);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setImageFiles(prev => [...prev, ...validFiles]);
      
      // Create previews
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }

    // Reset input
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      let imageUrls: string[] = [];

      // Upload images if any
      if (imageFiles.length > 0) {
        try {
          setUploading(true);
          toast.info('Uploading bill images...');
          imageUrls = await uploadMultipleImages(imageFiles, 'transactions/bills');
          setUploadedImages(imageUrls);
          toast.success('Images uploaded successfully');
        } catch (error) {
          console.error('Error uploading images:', error);
          toast.error('Failed to upload images');
          setIsLoading(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }
      
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert([
          {
            type: formData.type,
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            date: new Date(formData.date).toISOString(),
            payment_method: formData.paymentMethod,
            reference_number: formData.referenceNumber || null,
            bill_images: imageUrls.length > 0 ? imageUrls : null
          }
        ])
        .select();

      if (error) {
        // If transaction creation fails, clean up uploaded images
        if (imageUrls.length > 0) {
          await deleteMultipleImages(imageUrls);
        }
        throw error;
      }

      toast.success('Transaction added successfully');
      navigate('/financials/transactions');
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/financials/transactions')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Add Transaction</h1>
          </div>

          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => handleSelectChange('type', value)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleSelectChange('category', value)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.type === 'income' ? (
                        <>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Investments">Investments</SelectItem>
                          <SelectItem value="Other Income">Other Income</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                          <SelectItem value="Labor">Labor</SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Rent">Rent</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Transportation">Transportation</SelectItem>
                          <SelectItem value="Other Expense">Other Expense</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Enter description"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select 
                    value={formData.paymentMethod} 
                    onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
                  <Input
                    id="referenceNumber"
                    name="referenceNumber"
                    placeholder="Enter reference number"
                    value={formData.referenceNumber}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bill Images (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Upload up to 5 images (receipts, invoices, bills)
                  </p>
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                            <img 
                              src={preview} 
                              alt={`Bill ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Input
                      id="billImages"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      disabled={uploading || imageFiles.length >= 5}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('billImages')?.click()}
                      disabled={uploading || imageFiles.length >= 5}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading...' : `Upload Images (${5 - imageFiles.length} remaining)`}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => navigate('/financials/transactions')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Transaction'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CreateTransaction;
