
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { Supplier } from '@/types';
import { toast } from 'sonner';

// Mock data for a single supplier
const mockSuppliers: Record<string, Supplier> = {
  '1': {
    id: '1',
    name: 'ABC Suppliers',
    telephone: '123-456-7890',
    address: '123 Main St, Anytown',
    paymentTerms: 'Net 30',
    createdAt: new Date('2023-01-01')
  },
  '2': {
    id: '2',
    name: 'XYZ Electronics',
    telephone: '987-654-3210',
    address: '456 Market St, Othertown',
    paymentTerms: 'Net 15',
    createdAt: new Date('2023-02-01')
  }
};

const paymentTermsOptions = [
  { value: 'Net 7', label: 'Net 7 days' },
  { value: 'Net 15', label: 'Net 15 days' },
  { value: 'Net 30', label: 'Net 30 days' },
  { value: 'Net 45', label: 'Net 45 days' },
  { value: 'Net 60', label: 'Net 60 days' },
  { value: 'COD', label: 'Cash on Delivery' }
];

const SupplierForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Initialize form state
  const [formData, setFormData] = useState<Omit<Supplier, 'id' | 'createdAt'>>(() => {
    if (isEditMode && id && mockSuppliers[id]) {
      const { id: _, createdAt: __, ...rest } = mockSuppliers[id];
      return rest;
    }
    return {
      name: '',
      telephone: '',
      address: '',
      paymentTerms: 'Net 30'
    };
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, paymentTerms: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    
    if (!formData.telephone.trim()) {
      toast.error('Telephone number is required');
      return;
    }
    
    if (!formData.address.trim()) {
      toast.error('Address is required');
      return;
    }
    
    // In a real app, this would be an API call
    console.log('Saving supplier:', formData);
    
    if (isEditMode) {
      toast.success('Supplier updated successfully');
    } else {
      toast.success('Supplier added successfully');
    }
    
    navigate('/purchasing/suppliers');
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/purchasing/suppliers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Suppliers
            </Button>
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Supplier' : 'Add Supplier'}</h1>
          </div>

          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Supplier Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Supplier Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter supplier name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telephone">Telephone</Label>
                  <Input
                    id="telephone"
                    name="telephone"
                    placeholder="Enter telephone number"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Enter complete address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select 
                    value={formData.paymentTerms} 
                    onValueChange={handleSelectChange}
                  >
                    <SelectTrigger id="paymentTerms">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTermsOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => navigate('/purchasing/suppliers')}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Update Supplier' : 'Add Supplier'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SupplierForm;
