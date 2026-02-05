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
import { ArrowLeft, Save, Upload, X, ImagePlus, Loader2, Package, ShoppingBag, Hammer } from 'lucide-react';
import { UnitOfMeasure, InventoryItem, ItemCategory, ProductType } from '@/types';
import { useInventory } from '@/hooks/useInventory';
import { toast } from 'sonner';
import { uploadImage, validateImageFile } from '@/lib/uploadUtils';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

const unitOfMeasureOptions: { value: UnitOfMeasure; label: string }[] = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'liters', label: 'Liter' },
  { value: 'meters', label: 'Meter' },
  { value: 'units', label: 'Units' }
];

const ItemForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { addItem, updateItem, getItemById, isLoading } = useInventory();

  // Tab state
  const [activeTab, setActiveTab] = useState<ItemCategory>('Selling');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unitOfMeasure: 'pieces' as UnitOfMeasure,
    itemCategory: 'Selling' as ItemCategory,
    // Crafting fields
    purchaseCost: '0',
    purchasedDate: '',
    isActive: true,
    // Selling fields
    sellingPrice: '0',
    currentStock: '0',
    imageUrl: '',
    specifications: ''
  });

  // Variant management (replaces productTypes)
  const [variants, setVariants] = useState<any[]>([]);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [newVariantQuantity, setNewVariantQuantity] = useState('');
  const [newVariantImageFile, setNewVariantImageFile] = useState<File | null>(null);
  const [newVariantImagePreview, setNewVariantImagePreview] = useState('');
  
  // File upload states
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const variantImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditMode && id && !isLoading) {
      const item = getItemById(id);
      if (item) {
        console.log('Loading item for edit:', item);
        const category = item.itemCategory || 'Selling';
        setActiveTab(category);
        
        setFormData({
          name: item.name,
          description: item.description,
          unitOfMeasure: item.unitOfMeasure,
          itemCategory: category,
          purchaseCost: item.purchaseCost.toString(),
          purchasedDate: item.purchasedDate ? new Date(item.purchasedDate).toISOString().split('T')[0] : '',
          isActive: item.isActive,
          sellingPrice: item.sellingPrice.toString(),
          currentStock: item.currentStock.toString(),
          imageUrl: item.imageUrl || '',
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
        
        // Load variants from database
        loadVariants(id);
      }
    }
  }, [id, isEditMode, getItemById, isLoading]);

  // Load variants for the current item
  const loadVariants = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('parent_item_id', parentId)
        .eq('is_variant', true);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setVariants(data);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  // Handle main image file selection
  const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setMainImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMainImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle variant image file selection
  const handleVariantImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setNewVariantImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewVariantImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove main image
  const handleRemoveMainImage = () => {
    setMainImageFile(null);
    setMainImagePreview('');
    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = '';
    }
  };

  // Handle variant image file selection
  const handleVariantImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setNewVariantImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewVariantImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Add new variant
  const handleAddVariant = async () => {
    if (!newVariantName.trim()) {
      toast.error('Variant name is required');
      return;
    }

    const price = parseFloat(newVariantPrice);
    const quantity = parseInt(newVariantQuantity);

    if (isNaN(price) || price < 0) {
      toast.error('Valid price is required');
      return;
    }

    if (isNaN(quantity) || quantity < 0) {
      toast.error('Valid quantity is required');
      return;
    }

    let imageUrl = '';
    if (newVariantImageFile) {
      setIsUploading(true);
      try {
        imageUrl = await uploadImage(newVariantImageFile, 'products');
        toast.success('Variant image uploaded!');
      } catch (error) {
        console.error('Error uploading variant image:', error);
        toast.error((error as Error).message || 'Failed to upload image');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const newVariant = {
      variant_name: newVariantName.trim(),
      selling_price: price,
      current_stock: quantity,
      image_url: imageUrl,
      isNew: true // Flag to indicate this needs to be created in DB
    };

    setVariants(prev => [...prev, newVariant]);
    setNewVariantName('');
    setNewVariantPrice('');
    setNewVariantQuantity('');
    setNewVariantImageFile(null);
    setNewVariantImagePreview('');
    
    if (variantImageInputRef.current) {
      variantImageInputRef.current.value = '';
    }

    toast.success('Variant added (will be saved with item)');
  };

  // Remove variant
  const handleRemoveVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
    toast.success('Variant removed');
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, unitOfMeasure: value as UnitOfMeasure }));
  };

  const handleTabChange = (tab: ItemCategory) => {
    setActiveTab(tab);
    setFormData(prev => ({ ...prev, itemCategory: tab }));
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
    if (mainImageFile) {
      setIsUploading(true);
      try {
        toast.info('Uploading main image...');
        uploadedMainImageUrl = await uploadImage(mainImageFile, 'products');
        toast.success('Main image uploaded!');
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
      const baseItemData: any = {
        name: formData.name,
        description: formData.description,
        unitOfMeasure: formData.unitOfMeasure,
        itemCategory: activeTab,
        imageUrl: uploadedMainImageUrl || undefined,
        isActive: formData.isActive,
      };

      // Crafting item specific fields
      if (activeTab === 'Crafting') {
        const purchaseCost = parseFloat(formData.purchaseCost);
        if (isNaN(purchaseCost) || purchaseCost < 0) {
          toast.error('Purchase cost must be a positive number');
          return;
        }

        baseItemData.purchaseCost = purchaseCost;
        baseItemData.sellingPrice = 0; // Not used for crafting items
        baseItemData.purchasedDate = formData.purchasedDate || undefined;
        baseItemData.isWebsiteItem = false; // Crafting items never shown on website
        baseItemData.itemType = 'Materials';
        baseItemData.currentStock = 0;
        baseItemData.reorderLevel = 0;
      }
      // Selling item specific fields
      else {
        const sellingPrice = parseFloat(formData.sellingPrice);
        const currentStock = parseInt(formData.currentStock);

        if (isNaN(sellingPrice) || sellingPrice < 0) {
          toast.error('Selling price must be a positive number');
          return;
        }

        if (isNaN(currentStock) || currentStock < 0) {
          toast.error('Current stock must be a positive number');
          return;
        }

        baseItemData.purchaseCost = 0; // Not used for selling items
        baseItemData.sellingPrice = sellingPrice;
        baseItemData.discountPercentage = 0; // Removed from UI
        baseItemData.currentStock = currentStock;
        baseItemData.reorderLevel = 0; // Removed from UI
        baseItemData.sku = ''; // Removed from UI
        baseItemData.isWebsiteItem = currentStock > 0; // Only show on website if in stock
        baseItemData.itemType = 'Finished Products';
        baseItemData.weight = 0; // Removed from UI
        baseItemData.specifications = formData.specifications || undefined;
      }

      let parentItemId = id;

      if (isEditMode && id) {
        // Update main item
        await supabase
          .from('inventory_items')
          .update(baseItemData)
          .eq('id', id);
        
        toast.success('Item updated successfully');
      } else {
        // Create new main item
        const { data: newItem, error: itemError } = await supabase
          .from('inventory_items')
          .insert([{
            ...baseItemData,
            category: activeTab === 'Crafting' ? 'Raw Materials' : 'Leather Products',
            sku: '',
            is_variant: false,
            parent_item_id: null
          }])
          .select()
          .single();

        if (itemError) throw itemError;
        parentItemId = newItem.id;
        
        toast.success('Item added successfully');
      }

      // Handle variants for selling items
      if (activeTab === 'Selling' && variants.length > 0) {
        for (const variant of variants) {
          if (variant.isNew) {
            // Create new variant
            await supabase
              .from('inventory_items')
              .insert([{
                name: formData.name,
                variant_name: variant.variant_name,
                description: formData.description,
                unit_of_measure: formData.unitOfMeasure,
                item_category: 'Selling',
                selling_price: variant.selling_price,
                current_stock: variant.current_stock,
                purchase_cost: 0,
                image_url: variant.image_url || formData.imageUrl,
                is_active: true,
                is_variant: true,
                parent_item_id: parentItemId,
                item_type: 'Finished Products',
                is_website_item: variant.current_stock > 0,
                reorder_level: 0,
                sku: ''
              }]);
          }
        }
        toast.success(`${variants.length} variant(s) saved`);
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
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Item' : 'Add Item'}</h1>
          </div>

          {/* Tab Navigation */}
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
              <Hammer className="h-4 w-4" />
              Crafting
            </Button>
          </div>

          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {activeTab === 'Selling' ? (
                    <>
                      <ShoppingBag className="h-5 w-5" />
                      Selling Item Information
                    </>
                  ) : (
                    <>
                      <Hammer className="h-5 w-5" />
                      Crafting Item Information
                    </>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'Selling' 
                    ? 'Items that will be displayed and sold on the website'
                    : 'Internal items used for crafting - not displayed on website'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Common Fields */}
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

                {/* Main Product Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="mainImage">Product Image</Label>
                  <input
                    ref={mainImageInputRef}
                    type="file"
                    id="mainImage"
                    accept="image/*"
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
                      {mainImageFile || mainImagePreview || formData.imageUrl ? 'Change Image' : 'Upload Image'}
                    </Button>
                    
                    {(mainImagePreview || formData.imageUrl) && (
                      <div className="relative w-full h-48 border-2 border-dashed rounded-lg overflow-hidden">
                        <img
                          src={mainImagePreview || formData.imageUrl}
                          alt="Main product preview"
                          className="w-full h-full object-contain"
                        />
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
                    Recommended size: 400x400px or higher. Max 5MB. JPG, PNG, WebP, or GIF.
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

                {/* Crafting Item Fields */}
                {activeTab === 'Crafting' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseCost">Purchased Cost</Label>
                      <Input
                        id="purchaseCost"
                        name="purchaseCost"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter purchased cost"
                        value={formData.purchaseCost}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purchasedDate">Purchased Date</Label>
                      <Input
                        id="purchasedDate"
                        name="purchasedDate"
                        type="date"
                        value={formData.purchasedDate}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
                      <Select 
                        value={formData.unitOfMeasure} 
                        onValueChange={handleSelectChange}
                      >
                        <SelectTrigger id="unitOfMeasure">
                          <SelectValue placeholder="Select unit of measure" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitOfMeasureOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox 
                        id="isActive" 
                        checked={formData.isActive}
                        onCheckedChange={handleCheckboxChange}
                      />
                      <Label htmlFor="isActive" className="font-medium">
                        Active Status
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      Inactive items will not appear in selection lists
                    </p>
                  </>
                )}

                {/* Selling Item Fields */}
                {activeTab === 'Selling' && (
                  <>
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
                      <Label htmlFor="currentStock">Current Stock</Label>
                      <Input
                        id="currentStock"
                        name="currentStock"
                        type="number"
                        min="0"
                        placeholder="Enter current stock"
                        value={formData.currentStock}
                        onChange={handleInputChange}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Product hidden from website if stock = 0
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

                    {/* Product Types Section */}
                    <div className="border-t pt-4 mt-4">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-semibold">Product Types / Variants</Label>
                          <p className="text-sm text-muted-foreground">
                            Add different types or colors for this product (e.g., Green, Red, Brown)
                          </p>
                        </div>

                        {/* Add Type Form */}
                        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="newTypeName">Type Name</Label>
                            <Input
                              id="newTypeName"
                              placeholder="e.g., Green, Red, Brown"
                              value={newTypeName}
                              onChange={(e) => setNewTypeName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Type Image</Label>
                            <input
                              ref={typeImageInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleTypeImageSelect}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => typeImageInputRef.current?.click()}
                              className="w-full"
                              size="sm"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {newTypeImagePreview ? 'Change Image' : 'Upload Type Image'}
                            </Button>
                            
                            {newTypeImagePreview && (
                              <div className="relative w-24 h-24 border-2 rounded-lg overflow-hidden">
                                <img
                                  src={newTypeImagePreview}
                                  alt="Type preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>

                          <Button
                            type="button"
                            onClick={handleAddProductType}
                            disabled={isUploading || !newTypeName || !newTypeImageFile}
                            size="sm"
                          >
                            <ImagePlus className="h-4 w-4 mr-2" />
                            Add Type
                          </Button>
                        </div>

                        {/* Display Added Variants */}
                        {variants.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Added Variants:</Label>
                            <div className="space-y-2">
                              {variants.map((variant, index) => (
                                <div
                                  key={index}
                                  className="relative border-2 rounded-lg overflow-hidden group"
                                >
                                  <img
                                    src={type.imageUrl}
                                    alt={type.name}
                                    className="w-full h-32 object-cover"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm text-center">
                                    {type.name}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveProductType(index)}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={activeTab === 'Selling' ? 'default' : 'secondary'}>
                    {activeTab === 'Selling' ? (
                      <>
                        <ShoppingBag className="h-3 w-3 mr-1" />
                        Will be displayed on website
                      </>
                    ) : (
                      <>
                        <Hammer className="h-3 w-3 mr-1" />
                        Internal use only
                      </>
                    )}
                  </Badge>
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
                        {isEditMode ? 'Update Item' : 'Add Item'}
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ItemForm;
