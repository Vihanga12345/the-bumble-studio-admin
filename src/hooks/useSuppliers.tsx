
import { useState, useEffect } from 'react';
import { Supplier } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', '550e8400-e29b-41d4-a716-446655440000')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      const formattedSuppliers = data.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        telephone: supplier.telephone || '',
        address: supplier.address || '',
        paymentTerms: supplier.payment_terms || '',
        createdAt: new Date(supplier.created_at)
      }));
      
      setSuppliers(formattedSuppliers);
      console.log('Suppliers loaded from database:', formattedSuppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch suppliers when the hook mounts
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    
    try {
      const businessId = '550e8400-e29b-41d4-a716-446655440000';

      await supabase
        .from('businesses')
        .upsert(
          { id: businessId, name: 'The Bumble Studio', is_active: true },
          { onConflict: 'id' }
        );

      const { data, error } = await supabase
        .from('suppliers')
        .insert([
          {
            name: supplier.name,
            telephone: supplier.telephone,
            address: supplier.address,
            payment_terms: supplier.paymentTerms,
            business_id: businessId, // Default e-commerce business
            is_active: true
          }
        ])
        .select('*')
        .single();
      
      if (error) {
        throw error;
      }
      
      const newSupplier: Supplier = {
        id: data.id,
        name: data.name,
        telephone: data.telephone || '',
        address: data.address || '',
        paymentTerms: data.payment_terms || '',
        createdAt: new Date(data.created_at)
      };
      
      setSuppliers(prevSuppliers => [...prevSuppliers, newSupplier]);
      console.log('Added new supplier:', newSupplier);
      toast.success('Supplier added successfully');
      setIsLoading(false);
      return newSupplier;
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Failed to add supplier');
      setIsLoading(false);
      throw error;
    }
  };

  const updateSupplier = async (id: string, supplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          name: supplier.name,
          telephone: supplier.telephone,
          address: supplier.address,
          payment_terms: supplier.paymentTerms,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setSuppliers(prevSuppliers => 
        prevSuppliers.map(s => 
          s.id === id ? { 
            ...supplier, 
            id, 
            createdAt: s.createdAt 
          } : s
        )
      );
      console.log('Updated supplier with ID:', id);
      toast.success('Supplier updated successfully');
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error('Failed to update supplier');
      setIsLoading(false);
      throw error;
    }
  };

  const deleteSupplier = async (id: string) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setSuppliers(prevSuppliers => prevSuppliers.filter(s => s.id !== id));
      console.log('Deleted supplier with ID:', id);
      toast.success('Supplier deleted successfully');
      setIsLoading(false);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
      setIsLoading(false);
      throw error;
    }
  };

  const getSupplierById = (id: string): Supplier | undefined => {
    return suppliers.find(s => s.id === id);
  };

  return {
    suppliers,
    isLoading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById,
    refreshSuppliers: fetchSuppliers
  };
};
