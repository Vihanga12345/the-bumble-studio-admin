import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Upload, X, Loader2, ShoppingBag, Layers } from 'lucide-react';
import { UnitOfMeasure, ItemCategory } from '@/types';
import { useInventory } from '@/hooks/useInventory';
import { useHides } from '@/hooks/useHides';
import { toast } from 'sonner';
import { uploadMultipleImages, validateImageFile } from '@/lib/uploadUtils';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

const unitOfMeasureOptions: { value: UnitOfMeasure; label: string }[] = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'liters', label: 'Liter' },
  { value: 'meters', label: 'Meter' },
  { value: 'units', label: 'Units' }
];
const MAX_IMAGES_PER_ITEM = 5;

type ItemFormProps = {
  defaultCategory?: ItemCategory;
  hideTabs?: boolean;
};

const ItemForm = ({ defaultCategory = 'Selling', hideTabs = false }: ItemFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { getItemById, isLoading, refreshInventoryData } = useInventory();
  const { getAvailableHides } = useHides();

  // Tab state
  const [activeTab, setActiveTab] = useState<ItemCategory>(defaultCategory);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unitOfMeasure: 'pieces' as UnitOfMeasure,
    itemCategory: defaultCategory,
    // Crafting fields
    purchaseCost: '0',
    purchasedDate: '',
    isActive: true,
    // Selling fields
    sellingPrice: '0',
    imageUrl: '',
    specifications: '',
    mainStock: '0',
    isWebsiteItem: true
  });

  const [selectedLinkedHideIds, setSelectedLinkedHideIds] = useState<string[]>([]);
  
  // File upload states
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>('');
  const [mainAdditionalImageFiles, setMainAdditionalImageFiles] = useState<File[]>([]);
  const [mainAdditionalImagePreviews, setMainAdditionalImagePreviews] = useState<string[]>([]);
  const [existingMainAdditionalImages, setExistingMainAdditionalImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const availableHides = getAvailableHides();

  useEffect(() => {
    if (isEditMode && id && !isLoading) {
      const item = getItemById(id);
      if (item) {
        const category = item.itemCategory || 'Selling';
        setActiveTab(category);
        const isWebsiteFromItem = item.isWebsiteItem === true || item.isWebsiteItem === false ? item.isWebsiteItem : true;
        setFormData({
          name: item.name,
          description: item.description,
          unitOfMeasure: item.unitOfMeasure,
          itemCategory: category,
          purchaseCost: item.purchaseCost.toString(),
          purchasedDate: item.purchasedDate ? new Date(item.purchasedDate).toISOString().split('T')[0] : '',
          isActive: item.isActive,
          sellingPrice: item.sellingPrice.toString(),
          imageUrl: item.imageUrl || '',
          mainStock: item.currentStock?.toString() || '0',
          isWebsiteItem: isWebsiteFromItem,
          specifications: (() => {
            try {
              if (!item.specifications || item.specifications === '{}') return '';
              if (typeof item.specifications === 'string') return item.specifications;
              const parsed = JSON.parse(item.specifications as string);
              return (parsed.features || []).join('\n');
            } catch {
              return '';
            }
          })()
        });
        
        if (category === 'Selling') {
          setExistingMainAdditionalImages(item.additionalImages || []);
          loadLinkedHides(id);
        } else {
          setSelectedLinkedHideIds([]);
          setExistingMainAdditionalImages([]);
        }
      }
    }
  }, [id, isEditMode, getItemById, isLoading]);

  useEffect(() => {
    if (!isEditMode) {
      setActiveTab(defaultCategory);
      setFormData(prev => ({ ...prev, itemCategory: defaultCategory }));
      if (defaultCategory === 'Crafting') {
        setFormData(prev => ({ ...prev, sellingPrice: '0', specifications: '' }));
      } else {
        setFormData(prev => ({ ...prev, purchaseCost: '0', purchasedDate: '' }));
      }
    }
  }, [defaultCategory, isEditMode]);

  const loadLinkedHides = async (itemId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('inventory_item_hides')
        .select('hide_id')
        .eq('inventory_item_id', itemId)
        .eq('is_active', true);
      if (error) throw error;
      setSelectedLinkedHideIds((data || []).map((row: any) => row.hide_id));
    } catch (error) {
      console.error('Error loading linked hides:', error);
      setSelectedLinkedHideIds([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleWebsiteVisibilityChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isWebsiteItem: checked }));
  };

  // Handle main image file selection
  const handleMainImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    if (validFiles.length > MAX_IMAGES_PER_ITEM) {
      toast.error(`You can upload up to ${MAX_IMAGES_PER_ITEM} images per item.`);
    }

    const limitedFiles = validFiles.slice(0, MAX_IMAGES_PER_ITEM);
    setMainImageFile(limitedFiles[0] || null);
    setMainAdditionalImageFiles(limitedFiles.slice(1));
    setExistingMainAdditionalImages([]);

    const previews = await Promise.all(
      limitedFiles.map((file) => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      }))
    );
    setMainImagePreview(previews[0] || '');
    setMainAdditionalImagePreviews(previews.slice(1));
  };

  // Remove main image
  const handleRemoveMainImage = () => {
    setMainImageFile(null);
    setMainImagePreview('');
    setMainAdditionalImageFiles([]);
    setMainAdditionalImagePreviews([]);
    setExistingMainAdditionalImages([]);
    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = '';
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, unitOfMeasure: value as UnitOfMeasure }));
  };

  const handleTabChange = (tab: ItemCategory) => {
    setActiveTab(tab);
    setFormData(prev => ({ ...prev, itemCategory: tab }));
    if (!isEditMode) {
      if (tab === 'Crafting') {
        setSelectedLinkedHideIds([]);
        setFormData(prev => ({ ...prev, sellingPrice: '0', specifications: '', isWebsiteItem: false }));
      } else {
        setFormData(prev => ({ ...prev, purchaseCost: '0', purchasedDate: '', isWebsiteItem: true }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    // Upload main image if selected
    let uploadedMainImageUrl = formData.imageUrl;
    let uploadedMainAdditionalImages = [...existingMainAdditionalImages];
    if (mainImageFile || mainAdditionalImageFiles.length > 0) {
      setIsUploading(true);
      try {
        toast.info('Uploading item images...');
        const filesToUpload = [
          ...(mainImageFile ? [mainImageFile] : []),
          ...mainAdditionalImageFiles
        ].slice(0, MAX_IMAGES_PER_ITEM);
        const uploadedMainImages = await uploadMultipleImages(filesToUpload, 'products');
        uploadedMainImageUrl = uploadedMainImages[0] || uploadedMainImageUrl;
        uploadedMainAdditionalImages = uploadedMainImages.slice(1, MAX_IMAGES_PER_ITEM);
        toast.success('Item images uploaded!');
      } catch (error) {
        console.error('Error uploading image:', error);
        const errorMessage = (error as Error).message;
        
        if (errorMessage.includes('row-level security policy')) {
          toast.error(
            'Storage not configured! Please run the storage setup SQL script in Supabase.',
            { duration: 10000 }
          );
        } else {
          toast.error(`Failed to upload image: ${errorMessage}`);
        }
        
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }
    
    try {
      const mainStockValue = activeTab === 'Selling'
        ? 0
        : Math.max(0, parseInt(formData.mainStock || '0'));
      const baseItemData: any = {
        name: formData.name,
        description: formData.description,
        unit_of_measure: formData.unitOfMeasure,
        item_category: activeTab,
        image_url: uploadedMainImageUrl || undefined,
        is_active: formData.isActive,
      };

      const isWebsiteItemValue = activeTab === 'Selling' ? Boolean(formData.isWebsiteItem) : false;

      // Crafting item specific fields
      if (activeTab === 'Crafting') {
        const purchaseCost = parseFloat(formData.purchaseCost);
        if (isNaN(purchaseCost) || purchaseCost < 0) {
          toast.error('Buying price must be a positive number');
          return;
        }
        baseItemData.purchase_cost = purchaseCost;
        baseItemData.selling_price = purchaseCost;
        baseItemData.purchased_date = formData.purchasedDate || undefined;
        baseItemData.is_website_item = false; // Crafting items never shown on website
        baseItemData.item_type = 'Materials';
        baseItemData.current_stock = 0;
        baseItemData.reorder_level = 0;
      }
      // Selling item specific fields
      else {
        const sellingPrice = parseFloat(formData.sellingPrice);

        if (isNaN(sellingPrice) || sellingPrice < 0) {
          toast.error('Selling price must be a positive number');
          return;
        }

        baseItemData.purchase_cost = 0; // Not used for selling items
        baseItemData.selling_price = sellingPrice;
        baseItemData.discount_percentage = 0; // Removed from UI
        baseItemData.current_stock = 0;
        baseItemData.reorder_level = 0; // Removed from UI
        baseItemData.sku = ''; // Removed from UI
        baseItemData.is_website_item = isWebsiteItemValue;
        baseItemData.item_type = 'Finished Products';
        baseItemData.weight = 0; // Removed from UI
        baseItemData.specifications = formData.specifications || undefined;
      }
      
      const mainItemPayload = {
        name: baseItemData.name,
        description: baseItemData.description,
        unit_of_measure: baseItemData.unit_of_measure,
        item_category: baseItemData.item_category,
        image_url: baseItemData.image_url || null,
        additional_images: JSON.stringify(uploadedMainAdditionalImages || []),
        is_active: baseItemData.is_active,
        purchase_cost: baseItemData.purchase_cost,
        selling_price: baseItemData.selling_price,
        purchased_date: baseItemData.purchased_date || null,
        is_website_item: isWebsiteItemValue,
        item_type: baseItemData.item_type,
        current_stock: baseItemData.current_stock,
        reorder_level: baseItemData.reorder_level,
        discount_percentage: baseItemData.discount_percentage,
        weight: baseItemData.weight,
        specifications: baseItemData.specifications,
        category: activeTab === 'Crafting' ? 'Raw Materials' : 'Leather Products',
        sku: '',
        is_variant: false,
        parent_item_id: null,
        business_id: '550e8400-e29b-41d4-a716-446655440000'
      };
      
      let parentItemId = id;

      if (isEditMode && id) {
        // Update all fields except is_website_item first
        const payloadWithoutVisibility = { ...mainItemPayload };
        delete payloadWithoutVisibility.is_website_item;

        const { error: updateError } = await supabase
          .from('inventory_items')
          .update(payloadWithoutVisibility)
          .eq('id', id);
        
        if (updateError) {
          throw updateError;
        }

        // Update visibility separately via RPC (SECURITY DEFINER - bypasses RLS and any triggers)
        if (activeTab === 'Selling') {
          const { error: rpcError } = await supabase.rpc('set_inventory_item_website_visibility', {
            p_item_id: id,
            p_is_visible: isWebsiteItemValue
          });

          if (rpcError) {
            // RPC may not be deployed yet - fall back to direct update
            const { error: directVisibilityError } = await supabase
              .from('inventory_items')
              .update({ is_website_item: isWebsiteItemValue })
              .eq('id', id);
            
            if (directVisibilityError) {
              console.error('Visibility update failed (both RPC and direct):', rpcError, directVisibilityError);
              toast.warning('Item saved but website visibility may not have updated. Please run the latest DB migration.');
            }
          }
        }
        
        await refreshInventoryData();
        toast.success('Item updated successfully');
      } else {
        // Create new main item
        const { data: newItem, error: itemError } = await supabase
          .from('inventory_items')
          .insert([mainItemPayload])
          .select('*')
          .single();

        if (itemError) {
          throw itemError;
        }
        parentItemId = newItem.id;
        
        toast.success('Item added successfully');
      }

      // Handle linked hides for selling items
      if (activeTab === 'Selling' && parentItemId) {
        await (supabase as any)
          .from('inventory_item_hides')
          .delete()
          .eq('inventory_item_id', parentItemId);

        if (selectedLinkedHideIds.length > 0) {
          const hideLinks = selectedLinkedHideIds.map((hideId) => ({
            inventory_item_id: parentItemId,
            hide_id: hideId,
            is_active: true
          }));
          const { error: hideLinksError } = await (supabase as any)
            .from('inventory_item_hides')
            .insert(hideLinks);
          if (hideLinksError) {
            throw hideLinksError;
          }
        }
      }

      navigate('/inventory/items');
    } catch (error) {
      console.error('Error saving item:', error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;
        if (dbError.code === '23505') {
          if (dbError.details?.includes('name')) {
            toast.error('Item name already exists. Please use a different name.');
          } else {
            toast.error('This item conflicts with existing data. Please check your inputs.');
          }
        } else {
          toast.error(`Database error: ${dbError.message || 'Unknown error'}`);
        }
      } else {
        toast.error(`Error: ${(error as Error).message}`);
      }
    }
  };

  if (isEditMode && isLoading) {
    return (
      <Layout>
        <div className="container mx-auto">
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/inventory/items')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold">Loading Item...</h1>
            </div>
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">Loading item details...</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/inventory/items')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">
              {isEditMode ? (activeTab === 'Crafting' ? 'Edit Crafting Material' : 'Edit Item') : (activeTab === 'Crafting' ? 'Add Crafting Material' : 'Add Item')}
            </h1>
          </div>

          {/* Tab Navigation */}
          {!hideTabs && (
            <div className="flex justify-end gap-2">
              <Button
                variant={activeTab === 'Selling' ? 'default' : 'outline'}
                onClick={() => handleTabChange('Selling')}
                className="flex items-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" />
                Selling
              </Button>
              <Button
                variant={activeTab === 'Crafting' ? 'default' : 'outline'}
                onClick={() => handleTabChange('Crafting')}
                className="flex items-center gap-2"
              >
                <Layers className="h-4 w-4" />
                Hides
              </Button>
            </div>
          )}

          {activeTab === 'Selling' ? (
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Selling Item Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Items that will be displayed and sold on the website
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter item name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mainImage">Product Image</Label>
                    <input
                      ref={mainImageInputRef}
                      type="file"
                      id="mainImage"
                      accept="image/*"
                      multiple
                      onChange={handleMainImageSelect}
                      className="hidden"
                    />
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => mainImageInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {mainImageFile || mainImagePreview || formData.imageUrl ? 'Change Images' : 'Upload Images'}
                      </Button>
                      
                      {([mainImagePreview || formData.imageUrl, ...mainAdditionalImagePreviews, ...existingMainAdditionalImages].filter(Boolean).length > 0) && (
                        <div className="relative border-2 border-dashed rounded-lg p-3">
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {[mainImagePreview || formData.imageUrl, ...mainAdditionalImagePreviews, ...existingMainAdditionalImages]
                              .filter(Boolean)
                              .slice(0, MAX_IMAGES_PER_ITEM)
                              .map((img, index) => (
                                <img
                                  key={`${img}-${index}`}
                                  src={img}
                                  alt={`Product preview ${index + 1}`}
                                  className="w-full h-20 object-cover rounded"
                                />
                              ))}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleRemoveMainImage}
                            className="absolute top-2 right-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload up to {MAX_IMAGES_PER_ITEM} images. The first image is used as the primary product image on cards.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter item description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sellingPrice">Selling Price</Label>
                    <Input
                      id="sellingPrice"
                      name="sellingPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter selling price"
                      value={formData.sellingPrice}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      This price will be displayed on the website
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specifications">Product Specifications</Label>
                    <Textarea
                      id="specifications"
                      name="specifications"
                      placeholder="Enter product specifications (one per line)"
                      value={formData.specifications}
                      onChange={handleInputChange}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter each specification on a new line
                    </p>
                  </div>

                  <div className="flex items-start justify-between gap-4 rounded-lg border p-4 bg-muted/20">
                    <div className="space-y-1">
                      <Label htmlFor="isWebsiteItem" className="text-sm font-medium">
                        Visible on Website
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Turn off to hide this selling item from website pages.
                      </p>
                    </div>
                    <Switch
                      id="isWebsiteItem"
                      checked={formData.isWebsiteItem}
                      onCheckedChange={handleWebsiteVisibilityChange}
                    />
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                    <Label className="text-base font-semibold">Leather Hide (Website Selection)</Label>
                    <p className="text-sm text-muted-foreground">
                      Select hides customers can choose from during checkout. Shows animal, grain, finishing and image.
                    </p>
                    {availableHides.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {availableHides.map((hide) => (
                          <label key={hide.id} className="flex items-start gap-3 border rounded p-3 cursor-pointer hover:bg-muted/30">
                            <Checkbox
                              checked={selectedLinkedHideIds.includes(hide.id)}
                              onCheckedChange={(checked) => {
                                setSelectedLinkedHideIds((prev) =>
                                  checked ? [...prev, hide.id] : prev.filter((id) => id !== hide.id)
                                );
                              }}
                            />
                            <div className="flex gap-2 flex-1 min-w-0">
                              {(hide.imageUrls?.[0]) ? (
                                <img src={hide.imageUrls[0]} alt={hide.hideName} className="w-12 h-12 object-cover rounded flex-shrink-0" />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">No img</div>
                              )}
                              <div className="min-w-0">
                                <span className="text-sm font-medium block">{hide.hideName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {hide.animalType} · {hide.leatherGrain || '-'} · {hide.finishing}
                                  {hide.leatherGrain ? ` · ${hide.leatherGrain}` : ''}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No active hides available. Add hides first.</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      <ShoppingBag className="h-3 w-3 mr-1" />
                      Selling Item
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formData.isWebsiteItem ? 'Displayed on website' : 'Hidden from website'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => navigate('/inventory/items')} disabled={isUploading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isEditMode ? 'Update Item' : 'Create Selling Item'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          ) : (
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Crafting Material Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Materials like Threads, etc. used in production - addable to sales order materials
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g. Threads, Wax"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter item description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mainImage">Images (max {MAX_IMAGES_PER_ITEM})</Label>
                    <input
                      ref={mainImageInputRef}
                      type="file"
                      id="mainImage"
                      accept="image/*"
                      multiple
                      onChange={handleMainImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => mainImageInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {mainImageFile || mainImagePreview || formData.imageUrl ? 'Change Images' : 'Upload Images'}
                    </Button>
                    {([mainImagePreview || formData.imageUrl, ...mainAdditionalImagePreviews, ...existingMainAdditionalImages].filter(Boolean).length > 0) && (
                      <div className="relative border-2 border-dashed rounded-lg p-3">
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {[mainImagePreview || formData.imageUrl, ...mainAdditionalImagePreviews, ...existingMainAdditionalImages]
                            .filter(Boolean)
                            .slice(0, MAX_IMAGES_PER_ITEM)
                            .map((img, index) => (
                              <img
                                key={`${img}-${index}`}
                                src={img}
                                alt={`Item preview ${index + 1}`}
                                className="w-full h-20 object-cover rounded"
                              />
                            ))}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveMainImage}
                          className="absolute top-2 right-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload up to {MAX_IMAGES_PER_ITEM} images.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaseCost">Buying Price (Rs)</Label>
                    <Input
                      id="purchaseCost"
                      name="purchaseCost"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter buying price"
                      value={formData.purchaseCost}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={handleCheckboxChange}
                    />
                    <Label htmlFor="isActive" className="font-medium">
                      Active (appears in sales order materials)
                    </Label>
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <Layers className="h-3 w-3 mr-1" />
                      Crafting Material
                    </Badge>
                    <span className="text-xs text-muted-foreground">Addable to sales order materials</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => navigate('/inventory/items')} disabled={isUploading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isEditMode ? 'Update Material' : 'Create Crafting Material'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ItemForm;
