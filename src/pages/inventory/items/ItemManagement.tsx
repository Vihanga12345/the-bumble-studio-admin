
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Package, Plus, Search, Edit, Trash2, Download, Loader2, ShoppingBag, Layers, PlusCircle, MinusCircle, Link2, Scissors, Box, FileDown } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useHides } from '@/hooks/useHides';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { generateInventoryCatalogPDF } from '@/lib/pdfGenerator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LinkedItemInfo, ItemCategory } from '@/types';
import { supabase } from '@/integrations/supabase/client';

type TabValue = 'selling' | 'crafting' | 'hides';

const ItemManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = (searchParams.get('tab') as TabValue) || 'selling';
  const [activeTab, setActiveTab] = useState<TabValue>(tabFromUrl);
  const { items, deleteItem, getLinkedItems } = useInventory();
  const { hides, deleteHide } = useHides();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'item' | 'hide'>('item');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  // Sync tab with URL
  useEffect(() => {
    const t = searchParams.get('tab') as TabValue;
    if (t && ['selling', 'crafting', 'hides'].includes(t)) setActiveTab(t);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    const v = value as TabValue;
    setActiveTab(v);
    setSearchParams({ tab: v });
  };

  // Filter items (main items only, no variants)
  const filteredSellingItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch && item.itemCategory === 'Selling' && !item.isVariant && !item.parentItemId;
  });

  const filteredCraftingItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch && item.itemCategory === 'Crafting' && !item.isVariant && !item.parentItemId;
  });

  const filteredHides = hides.filter(hide => {
    const matchesSearch = hide.hideName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hide.finishing || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hide.leatherGrain || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hide.country || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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

  const openDeleteDialog = (id: string, type: 'item' | 'hide', e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(id);
    setDeleteType(type);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (deleteType === 'item') {
        await deleteItem(itemToDelete);
        toast.success('Item deleted successfully');
      } else {
        await deleteHide(itemToDelete);
      }
      setShowDeleteDialog(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error((error as Error).message || 'Failed to delete');
    }
  };

  const handleEditItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/inventory/items/${id}/edit`);
  };

  const handleEditHide = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/inventory/hides/${id}`);
  };

  const handleRowClickItem = (id: string) => navigate(`/inventory/items/${id}`);
  const handleRowClickHide = (id: string) => navigate(`/inventory/hides/${id}`);

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

  const exportToPdf = async () => {
    setIsExportingPdf(true);
    try {
      await generateInventoryCatalogPDF(items, hides);
      toast.success('Product catalog PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportToExcel = () => {
    try {
      const data = activeTab === 'hides'
        ? filteredHides.map(h => ({ Name: h.hideName, Grain: h.leatherGrain, Finishing: h.finishing, 'SQ Feet': h.sqFeet, Price: `Rs ${h.price.toFixed(2)}`, Status: h.isAvailable ? 'Available' : 'Not Available' }))
        : (activeTab === 'selling' ? filteredSellingItems : filteredCraftingItems).map(item => ({
            Name: item.name, Category: item.category || 'N/A', SKU: item.sku || 'N/A',
            'Current Stock': item.currentStock, 'Purchase Cost': `Rs ${item.purchaseCost.toFixed(2)}`,
            'Selling Price': `Rs ${item.sellingPrice.toFixed(2)}`
          }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, activeTab);
      XLSX.writeFile(workbook, `inventory_${activeTab}.xlsx`);
      toast.success('Exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4">
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
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={activeTab === 'hides' ? 'Search hides...' : 'Search items...'}
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={exportToPdf} disabled={isExportingPdf}>
                {isExportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Export PDF
              </Button>
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              {activeTab === 'selling' && (
                <Button onClick={() => navigate('/inventory/items/new-selling')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Selling Material
                </Button>
              )}
              {activeTab === 'crafting' && (
                <Button onClick={() => navigate('/inventory/items/new-crafting')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Crafting Material
                </Button>
              )}
              {activeTab === 'hides' && (
                <Button onClick={() => navigate('/inventory/hides/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Hide
                </Button>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="selling" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Selling Materials
              </TabsTrigger>
              <TabsTrigger value="crafting" className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Crafting Materials
              </TabsTrigger>
              <TabsTrigger value="hides" className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                Hides
              </TabsTrigger>
            </TabsList>

            <TabsContent value="selling" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Website</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSellingItems.length > 0 ? filteredSellingItems.map((item) => (
                          <TableRow key={item.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleRowClickItem(item.id)}>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded" onError={(e) => { e.currentTarget.src = '/placeholder.svg?height=48&width=48'; }} />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{item.name}{item.sku && <span className="block text-xs text-muted-foreground">SKU: {item.sku}</span>}</TableCell>
                            <TableCell>{item.category || '-'}</TableCell>
                            <TableCell><Badge variant={item.isActive ? 'default' : 'secondary'}>{item.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                            <TableCell className="text-right">Rs {item.sellingPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{item.isWebsiteItem ? <Badge className="bg-green-500">✓ Visible</Badge> : <Badge variant="secondary">✗ Hidden</Badge>}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={(e) => handleEditItem(item.id, e)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={(e) => openDeleteDialog(item.id, 'item', e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No selling materials found.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="crafting" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCraftingItems.length > 0 ? filteredCraftingItems.map((item) => (
                          <TableRow key={item.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleRowClickItem(item.id)}>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded" onError={(e) => { e.currentTarget.src = '/placeholder.svg?height=48&width=48'; }} />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{item.name}{item.sku && <span className="block text-xs text-muted-foreground">SKU: {item.sku}</span>}</TableCell>
                            <TableCell>{item.category || '-'}</TableCell>
                            <TableCell><Badge variant={item.isActive ? 'default' : 'secondary'}>{item.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                            <TableCell className="text-right">Rs {item.purchaseCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right"><span className={item.currentStock === 0 ? 'text-destructive font-semibold' : ''}>{item.currentStock}</span></TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" title="Add Stock" onClick={(e) => openTransactionDialog(item.id, item.name, 'craft_completed', e)} className="text-green-600"><PlusCircle className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={(e) => handleEditItem(item.id, e)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={(e) => openDeleteDialog(item.id, 'item', e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No crafting materials found.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hides" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Grain</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">SQ Feet</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHides.length > 0 ? filteredHides.map((hide) => (
                          <TableRow key={hide.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleRowClickHide(hide.id)}>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {hide.imageUrls?.[0] ? (
                                <img src={hide.imageUrls[0]} alt={hide.hideName} className="w-12 h-12 object-cover rounded" onError={(e) => { e.currentTarget.src = '/placeholder.svg?height=48&width=48'; }} />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center"><Box className="h-6 w-6 text-muted-foreground" /></div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{hide.hideName}</TableCell>
                            <TableCell>{hide.leatherGrain || '-'}</TableCell>
                            <TableCell><Badge variant={hide.isAvailable ? 'default' : 'secondary'}>{hide.isAvailable ? 'Available' : 'Not Available'}</Badge></TableCell>
                            <TableCell className="text-right">Rs {hide.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{hide.sqFeet.toFixed(2)}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={(e) => handleEditHide(hide.id, e)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={(e) => openDeleteDialog(hide.id, 'hide', e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hides found.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirmation Dialog for Delete */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteType === 'hide' ? 'Hide' : 'Item'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteType === 'hide' ? 'hide' : 'item'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
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
                    <div className="border rounded-lg overflow-hidden overflow-x-auto">
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
                    <div className="border rounded-lg overflow-hidden overflow-x-auto">
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
