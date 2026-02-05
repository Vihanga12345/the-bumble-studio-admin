
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, Plus, Search, Edit, Trash2, Download, Loader2, Filter, ShoppingBag, Hammer, Minus, PlusCircle, MinusCircle, ChevronRight, ChevronDown, Link2 } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LinkedItemInfo, ItemType, ItemCategory } from '@/types';
import { supabase } from '@/integrations/supabase/client';

const ItemManagement = () => {
  const navigate = useNavigate();
  const { items, deleteItem, getLinkedItems } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('Selling');
  
  // Linked items dialog state
  const [showLinkedItemsDialog, setShowLinkedItemsDialog] = useState(false);
  const [selectedItemForLinks, setSelectedItemForLinks] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  const [linkedItemsList, setLinkedItemsList] = useState<LinkedItemInfo[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  
  // Transaction dialog state
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<'craft_completed' | 'manufacturing_used'>('craft_completed');
  const [transactionItemId, setTransactionItemId] = useState<string | null>(null);
  const [transactionItemName, setTransactionItemName] = useState<string>('');
  const [transactionQuantity, setTransactionQuantity] = useState<string>('');
  const [transactionNotes, setTransactionNotes] = useState<string>('');
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  
  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [variantsByParent, setVariantsByParent] = useState<Record<string, any[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set());
  
  const showStockColumn = itemCategoryFilter !== 'Selling';

  // Filter to show only main items (not variants)
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = item.itemCategory === itemCategoryFilter;
    
    // Only show main items (is_variant = false or null, parent_item_id = null)
    const isMainItem = !item.isVariant && !item.parentItemId;
    
    return matchesSearch && matchesCategory && isMainItem;
  });
  
  // Load variants for a parent item
  const loadVariants = async (parentId: string) => {
    if (variantsByParent[parentId]) {
      return; // Already loaded
    }
    
    setLoadingVariants(prev => new Set(prev).add(parentId));
    
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('parent_item_id', parentId)
        .eq('is_variant', true);
      
      if (error) throw error;
      
      setVariantsByParent(prev => ({
        ...prev,
        [parentId]: data || []
      }));
    } catch (error) {
      console.error('Error loading variants:', error);
      toast.error('Failed to load variants');
    } finally {
      setLoadingVariants(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    const preloadVariants = async () => {
      const parentIds = filteredItems.map(item => item.id);
      if (parentIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('is_variant', true)
          .in('parent_item_id', parentIds);

        if (error) throw error;

        const grouped: Record<string, any[]> = {};
        (data || []).forEach(variant => {
          const parentId = variant.parent_item_id;
          if (!parentId) return;
          if (!grouped[parentId]) grouped[parentId] = [];
          grouped[parentId].push(variant);
        });

        setVariantsByParent(prev => ({
          ...prev,
          ...grouped
        }));
      } catch (error) {
        console.error('Error preloading variants:', error);
      }
    };

    preloadVariants();
  }, [filteredItems]);
  
  // Toggle row expansion
  const toggleRowExpansion = async (itemId: string) => {
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      // Load variants if not already loaded
      await loadVariants(itemId);
    }
    
    setExpandedRows(newExpanded);
  };

  const handleViewLinkedItems = async (itemId: string, itemName: string) => {
    setSelectedItemForLinks(itemId);
    setSelectedItemName(itemName);
    setShowLinkedItemsDialog(true);
    setIsLoadingLinks(true);
    
    try {
      const links = await getLinkedItems(itemId);
      setLinkedItemsList(links);
    } catch (error) {
      console.error('Error loading linked items:', error);
      toast.error('Failed to load linked items');
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const openDeleteDialog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteItem = async () => {
    if (itemToDelete) {
      try {
        await deleteItem(itemToDelete);
        toast.success('Item deleted successfully');
        setShowDeleteDialog(false);
        setItemToDelete(null);
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  const handleEditItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/inventory/items/${id}/edit`);
  };

  const handleRowClick = (id: string) => {
    navigate(`/inventory/items/${id}`);
  };

  const openTransactionDialog = (itemId: string, itemName: string, type: 'craft_completed' | 'manufacturing_used', e: React.MouseEvent) => {
    e.stopPropagation();
    setTransactionItemId(itemId);
    setTransactionItemName(itemName);
    setTransactionType(type);
    setTransactionQuantity('');
    setTransactionNotes('');
    setShowTransactionDialog(true);
  };

  const handleProcessTransaction = async () => {
    if (!transactionItemId || !transactionQuantity) {
      toast.error('Please enter a quantity');
      return;
    }

    const quantity = parseInt(transactionQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid positive quantity');
      return;
    }

    setIsProcessingTransaction(true);

    try {
      // Call the database function to record the transaction
      const quantityChange = transactionType === 'craft_completed' ? quantity : -quantity;
      
      const { data, error } = await supabase.rpc('record_inventory_transaction', {
        p_item_id: transactionItemId,
        p_transaction_type: transactionType,
        p_quantity_change: quantityChange,
        p_variant_name: null,
        p_reference_id: null,
        p_reference_type: null,
        p_notes: transactionNotes || (transactionType === 'craft_completed' ? 'Craft completed' : 'Used in manufacturing'),
        p_created_by: null
      });

      if (error) throw error;

      toast.success(
        transactionType === 'craft_completed' 
          ? `✓ Craft completed: +${quantity} items added` 
          : `✓ Manufacturing: -${quantity} items used`
      );
      
      // Refresh the items list
      window.location.reload(); // Simple refresh for now
      
      setShowTransactionDialog(false);
      setTransactionItemId(null);
      setTransactionQuantity('');
      setTransactionNotes('');
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast.error((error as Error).message || 'Failed to process transaction');
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  const exportToExcel = () => {
    try {
      // Prepare data for Excel export
      const exportData = items.map(item => ({
        'Name': item.name,
        'Category': item.category || 'N/A',
        'SKU': item.sku || 'N/A',
        'Unit': item.unitOfMeasure,
        'Current Stock': item.currentStock,
        'Reorder Level': item.reorderLevel,
        'Purchase Cost': `Rs ${item.purchaseCost.toFixed(2)}`,
        'Selling Price': `Rs ${item.sellingPrice.toFixed(2)}`,
        'Description': item.description
      }));
      
      // Create workbook and add worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Items');
      
      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, 'inventory_items.xlsx');
      
      toast.success('Inventory items exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting inventory items to Excel:', error);
      toast.error('Failed to export inventory items');
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
              <h1 className="text-3xl font-bold tracking-tight">Item Management</h1>
              <p className="text-muted-foreground">Create and edit inventory items</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search items..."
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={itemCategoryFilter} onValueChange={setItemCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Selling">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Selling Items
                    </div>
                  </SelectItem>
                  <SelectItem value="Crafting">
                    <div className="flex items-center gap-2">
                      <Hammer className="h-4 w-4" />
                      Crafting Items
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button onClick={() => navigate('/inventory/items/new-selling')}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Create Selling Product
              </Button>
              <Button onClick={() => navigate('/inventory/items/new-crafting')}>
                <Hammer className="mr-2 h-4 w-4" />
                Create Crafting Item
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventory Items
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    {showStockColumn && (
                      <TableHead className="text-right">Stock</TableHead>
                    )}
                    <TableHead className="text-right">Website</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const isExpanded = expandedRows.has(item.id);
                      const variants = variantsByParent[item.id] || [];
                      const isLoadingVars = loadingVariants.has(item.id);
                      const hasVariants = variants.length > 0;
                      
                      return [
                        /* Main Item Row */
                        <TableRow key={`item-${item.id}`} className="hover:bg-muted/50 font-medium">
                            {/* Expand/Collapse Arrow */}
                            <TableCell className="w-[40px]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRowExpansion(item.id);
                                }}
                              >
                                {isLoadingVars ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => handleRowClick(item.id)}
                        >
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
                        <TableCell 
                          className="font-medium cursor-pointer"
                          onClick={() => handleRowClick(item.id)}
                        >
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            {item.sku && (
                              <span className="text-xs text-muted-foreground">SKU: {item.sku}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => handleRowClick(item.id)}
                        >
                          <Badge variant={item.itemCategory === 'Selling' ? 'default' : 'secondary'}>
                            {item.itemCategory === 'Selling' ? (
                              <>
                                <ShoppingBag className="h-3 w-3 mr-1" />
                                Selling
                              </>
                            ) : (
                              <>
                                <Hammer className="h-3 w-3 mr-1" />
                                Crafting
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => handleRowClick(item.id)}
                        >
                          <Badge variant={item.isActive ? 'default' : 'secondary'}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell 
                          className="text-right cursor-pointer"
                          onClick={() => handleRowClick(item.id)}
                        >
                          {item.itemCategory === 'Selling' 
                            ? `Rs ${item.sellingPrice.toFixed(2)}`
                            : `Rs ${item.purchaseCost.toFixed(2)}`}
                        </TableCell>
                        {showStockColumn && (
                          <TableCell 
                            className="text-right cursor-pointer"
                            onClick={() => handleRowClick(item.id)}
                          >
                            <span className={(hasVariants ? variants.reduce((sum, variant) => sum + Number(variant.current_stock || 0), 0) : item.currentStock) === 0 ? 'text-destructive font-semibold' : ''}>
                              {hasVariants ? variants.reduce((sum, variant) => sum + Number(variant.current_stock || 0), 0) : item.currentStock}
                            </span>
                          </TableCell>
                        )}
                        <TableCell 
                          className="text-right cursor-pointer"
                          onClick={() => handleRowClick(item.id)}
                        >
                          {item.isWebsiteItem ? (
                            <Badge variant="default" className="bg-green-500">
                              ✓ Visible
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              ✗ Hidden
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {item.itemCategory === 'Crafting' && !hasVariants && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Add Stock"
                                onClick={(e) => openTransactionDialog(item.id, item.name, 'craft_completed', e)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => handleEditItem(item.id, e)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => openDeleteDialog(item.id, e)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                        </TableRow>,
                      
                      /* Variant Sub-Rows */
                      ...(isExpanded && variants.length > 0 ? variants.map((variant) => (
                        <TableRow key={variant.id} className="bg-muted/20 hover:bg-muted/40">
                          {/* Empty cell for alignment */}
                          <TableCell></TableCell>
                          
                          {/* Image */}
                          <TableCell>
                            {variant.image_url ? (
                              <img 
                                src={variant.image_url} 
                                alt={variant.variant_name || variant.name}
                                className="w-10 h-10 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg?height=40&width=40';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          
                          {/* Name with indent */}
                          <TableCell className="font-normal">
                            <div className="flex items-center gap-2 pl-4">
                              <span className="text-muted-foreground">↳</span>
                              <span>{variant.variant_name || variant.name}</span>
                            </div>
                          </TableCell>
                          
                          {/* Category */}
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              Variant
                            </Badge>
                          </TableCell>
                          
                          {/* Status */}
                          <TableCell>
                            <Badge variant={variant.is_active ? 'default' : 'secondary'} className="text-xs">
                              {variant.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          
                          {/* Price */}
                          <TableCell className="text-right">
                          {item.itemCategory === 'Selling' 
                            ? `Rs ${(variant.selling_price || variant.sellingPrice || 0).toFixed(2)}`
                            : `Rs ${(variant.purchase_cost || variant.purchaseCost || 0).toFixed(2)}`}
                          </TableCell>
                          
                          {/* Stock */}
                          {showStockColumn && (
                            <TableCell className="text-right">
                              <span className={variant.current_stock === 0 ? 'text-destructive font-semibold' : ''}>
                                {variant.current_stock || variant.currentStock || 0}
                              </span>
                            </TableCell>
                          )}
                          
                          {/* Website */}
                          <TableCell className="text-right">
                            <span className="text-muted-foreground text-xs">-</span>
                          </TableCell>
                          
                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {item.itemCategory === 'Crafting' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  title="Add Stock"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTransactionDialog(variant.id, `${item.name} - ${variant.variant_name}`, 'craft_completed', e);
                                  }}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <PlusCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              
                              {item.itemCategory === 'Crafting' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  title="Reduce Stock"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTransactionDialog(variant.id, `${item.name} - ${variant.variant_name}`, 'manufacturing_used', e);
                                  }}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <MinusCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditItem(variant.id, e);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog(variant.id, e);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) : []),
                      
                      /* Show message when expanded but no variants */
                      ...(isExpanded && variants.length === 0 && !isLoadingVars ? [(
                        <TableRow key={`empty-${item.id}`} className="bg-muted/10">
                          <TableCell colSpan={showStockColumn ? 9 : 8} className="text-center py-4 text-muted-foreground text-sm">
                            No variants for this item. Add variants in edit mode.
                          </TableCell>
                        </TableRow>
                      )] : [])
                    ];
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={showStockColumn ? 9 : 8} className="text-center py-8 text-muted-foreground">
                        No {itemCategoryFilter} items found. Add a new item to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog for Delete */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Linked Items Dialog */}
      <Dialog open={showLinkedItemsDialog} onOpenChange={setShowLinkedItemsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Linked Items
            </DialogTitle>
            <DialogDescription>
              Items linked to <strong>{selectedItemName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading linked items...</span>
              </div>
            ) : linkedItemsList.length > 0 ? (
              <div className="space-y-4">
                {/* Materials Section */}
                {linkedItemsList.filter(l => l.linkedItemType === 'Materials').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span>🧱</span> Materials
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Link</TableHead>
                            <TableHead className="text-right">Qty Required</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {linkedItemsList
                            .filter(link => link.linkedItemType === 'Materials')
                            .map((link) => (
                              <TableRow key={link.linkId}>
                                <TableCell className="font-medium">{link.linkedItemName}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {link.linkedItemSku || '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {link.linkType === 'child' ? '↓ Sub-item' : '↑ Parent'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">{link.quantityRequired}</TableCell>
                                <TableCell className="text-right">
                                  {link.currentStock !== undefined ? link.currentStock : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Finished Products Section */}
                {linkedItemsList.filter(l => l.linkedItemType === 'Finished Products').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span>📦</span> Finished Products
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Link</TableHead>
                            <TableHead className="text-right">Qty Required</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {linkedItemsList
                            .filter(link => link.linkedItemType === 'Finished Products')
                            .map((link) => (
                              <TableRow key={link.linkId}>
                                <TableCell className="font-medium">{link.linkedItemName}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {link.linkedItemSku || '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {link.linkType === 'child' ? '↓ Sub-item' : '↑ Parent'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">{link.quantityRequired}</TableCell>
                                <TableCell className="text-right">
                                  {link.currentStock !== undefined ? link.currentStock : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No linked items found</p>
                <p className="text-xs mt-1">
                  Edit this item to link it with other items
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkedItemsDialog(false)}>
              Close
            </Button>
            {selectedItemForLinks && (
              <Button onClick={() => {
                setShowLinkedItemsDialog(false);
                navigate(`/inventory/items/${selectedItemForLinks}/edit`);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Item
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {transactionType === 'craft_completed' ? (
                <>
                  <PlusCircle className="h-5 w-5 text-green-600" />
                  Craft Completed
                </>
              ) : (
                <>
                  <MinusCircle className="h-5 w-5 text-orange-600" />
                  Manufacturing Use
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {transactionType === 'craft_completed' 
                ? `Add crafted items to stock: ${transactionItemName}`
                : `Record items used in manufacturing: ${transactionItemName}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transaction-quantity">
                Quantity {transactionType === 'craft_completed' ? 'to Add' : 'Used'}
              </Label>
              <Input
                id="transaction-quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={transactionQuantity}
                onChange={(e) => setTransactionQuantity(e.target.value)}
                disabled={isProcessingTransaction}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transaction-notes">Notes (Optional)</Label>
              <Textarea
                id="transaction-notes"
                placeholder="Add any notes about this transaction..."
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                disabled={isProcessingTransaction}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTransactionDialog(false)}
              disabled={isProcessingTransaction}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessTransaction}
              disabled={isProcessingTransaction || !transactionQuantity}
              className={transactionType === 'craft_completed' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              {isProcessingTransaction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {transactionType === 'craft_completed' ? '+ Add to Stock' : '- Use Materials'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ItemManagement;
