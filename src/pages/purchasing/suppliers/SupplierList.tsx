
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Supplier } from '@/types';
import { toast } from 'sonner';

// Mock data for suppliers
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
  },
  {
    id: '4',
    name: 'Global Manufacturing',
    telephone: '222-333-4444',
    address: '101 Industrial Blvd, Factoryville',
    paymentTerms: 'Net 60',
    createdAt: new Date('2023-04-01')
  }
];

const SupplierList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.telephone.includes(searchTerm)
  );

  const handleDeleteSupplier = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real app, you would call an API to delete the supplier
    setSuppliers(suppliers.filter(supplier => supplier.id !== id));
    toast.success('Supplier deleted successfully');
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
              <p className="text-muted-foreground">Manage your supplier information</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search suppliers..."
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => navigate('/purchasing/suppliers/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Supplier Directory
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Number</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/purchasing/suppliers/${supplier.id}`)}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.telephone}</TableCell>
                        <TableCell>{supplier.address}</TableCell>
                        <TableCell>{supplier.paymentTerms}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/purchasing/suppliers/${supplier.id}/edit`);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => handleDeleteSupplier(supplier.id, e)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No suppliers found. Add a new supplier to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SupplierList;
