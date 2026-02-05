
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, Warehouse, AlertTriangle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/hooks/useInventory';

const StockVisibility = () => {
  const navigate = useNavigate();
  const { items } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Extract unique categories
  const categories = ['all', ...new Set(items.map(item => item.category || 'Uncategorized'))];

  // Filter items by search term and category
  const filteredItems = items.filter(item => {
    if (item.itemCategory === 'Selling') return false;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = 
      categoryFilter === 'all' || 
      (categoryFilter === 'Uncategorized' ? !item.category : item.category === categoryFilter);
      
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    } else if (quantity < 5) {
      return { label: 'Low Stock', color: 'bg-amber-100 text-amber-800' };
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
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
              <h1 className="text-3xl font-bold tracking-tight">Stock Visibility</h1>
              <p className="text-muted-foreground">View and monitor current inventory levels</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative w-full md:w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search items..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="w-full md:w-[200px]">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={() => navigate('/inventory/adjustments')}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Adjust Inventory
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">
                <div className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  Current Stock Levels
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Value (Rs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const stockStatus = getStockStatus(item.currentStock);
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/inventory/items/${item.id}`)}>
                          <TableCell>
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
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
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                          <TableCell>{item.category || 'Uncategorized'}</TableCell>
                          <TableCell>{item.unitOfMeasure}</TableCell>
                          <TableCell className="text-center">{item.currentStock}</TableCell>
                          <TableCell>
                            <Badge className={stockStatus.color}>{stockStatus.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">Rs {(item.currentStock * item.purchaseCost).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No items found. Add inventory items to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {filteredItems.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={7} className="text-right font-bold p-4">Total Inventory Value:</td>
                      <td className="text-right font-bold p-4">
                        Rs {filteredItems.reduce((sum, item) => sum + (item.currentStock * item.purchaseCost), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default StockVisibility;
