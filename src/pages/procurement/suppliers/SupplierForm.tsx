
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSuppliers } from '@/hooks/useSuppliers';

const SupplierForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { addSupplier, updateSupplier, fetchSupplierById } = useSuppliers();

  const [formData, setFormData] = useState({
    name: '',
    telephone: '',
    address: '',
    paymentTerms: ''
  });
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(false);

  useEffect(() => {
    if (!isEditMode || !id) return;
    let cancelled = false;
    setIsLoadingSupplier(true);
    fetchSupplierById(id)
      .then((supplier) => {
        if (cancelled) return;
        setIsLoadingSupplier(false);
        if (supplier) {
          setFormData({ name: supplier.name, telephone: supplier.telephone, address: supplier.address, paymentTerms: supplier.paymentTerms || '' });
        } else {
          toast.error('Supplier not found');
          navigate('/procurement/suppliers');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoadingSupplier(false);
          toast.error('Failed to load supplier');
          navigate('/procurement/suppliers');
        }
      });
    return () => { cancelled = true; };
  }, [id, isEditMode, fetchSupplierById, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    console.log('Saving supplier:', formData);
    
    try {
      if (isEditMode && id) {
        updateSupplier(id, formData);
        toast.success('Supplier updated successfully');
      } else {
        const newSupplier = addSupplier(formData);
        console.log('New supplier added:', newSupplier);
        toast.success('Supplier added successfully');
      }
      
      navigate('/procurement/suppliers');
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/procurement/suppliers')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Supplier' : 'Add Supplier'}</h1>
          </div>

          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Supplier Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSupplier && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isLoadingSupplier && (
                <>
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
                </>
                )}
              </CardContent>
              <CardFooter className="justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => navigate('/procurement/suppliers')} disabled={isLoadingSupplier}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoadingSupplier}>
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
