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
import { ArrowLeft, Save, Upload, X, ImagePlus, Loader2, Package, ShoppingBag, Hammer, Plus } from 'lucide-react';
import { UnitOfMeasure, ItemCategory } from '@/types';
import { useInventory } from '@/hooks/useInventory';
import { toast } from 'sonner';
import { uploadImage, uploadMultipleImages, validateImageFile } from '@/lib/uploadUtils';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

const unitOfMeasureOptions: { value: UnitOfMeasure; label: string }[] = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'liters', label: 'Liter' },
  { value: 'meters', label: 'Meter' },
  { value: 'units', label: 'Units' }
];

type ItemFormProps = {
  defaultCategory?: ItemCategory;
  hideTabs?: boolean;
};

const ItemForm = ({ defaultCategory = 'Selling', hideTabs = false }: ItemFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { getItemById, isLoading } = useInventory();

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
    mainStock: '0'
  });

  // Variant management (replaces productTypes)
  const [variants, setVariants] = useState<any[]>([]);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [newVariantImageFiles, setNewVariantImageFiles] = useState<File[]>([]);
  const [newVariantImagePreviews, setNewVariantImagePreviews] = useState<string[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  
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
          imageUrl: item.imageUrl || '',
          mainStock: item.currentStock?.toString() || '0',
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
          // Load variants from database
          loadVariants(id);
        } else {
          setVariants([]);
        }
      }
    }
  }, [id, isEditMode, getItemById, isLoading]);

  useEffect(() => {
    if (!isEditMode) {
      setActiveTab(defaultCategory);
      setFormData(prev => ({ ...prev, itemCategory: defaultCategory }));
      if (defaultCategory === 'Crafting') {
        setVariants([]);
        setDeletedVariantIds([]);
        setFormData(prev => ({ ...prev, sellingPrice: '0', specifications: '' }));
      } else {
        setFormData(prev => ({ ...prev, purchaseCost: '0', purchasedDate: '' }));
      }
    }
  }, [defaultCategory, isEditMode]);

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
        setVariants(
          data.map(variant => {
            let parsedAdditional: string[] = [];
            try {
              if (variant.additional_images) {
                parsedAdditional = Array.isArray(variant.additional_images)
                  ? variant.additional_images
                  : JSON.parse(variant.additional_images);
              }
            } catch {
              parsedAdditional = [];
            }
            return { ...variant, additional_images: parsedAdditional, isNew: false };
          })
        );
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
  const handleVariantImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setNewVariantImageFiles(validFiles);

    const previews = await Promise.all(
      validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );
    setNewVariantImagePreviews(previews);
  };

  // Remove main image
  const handleRemoveMainImage = () => {
    setMainImageFile(null);
    setMainImagePreview('');
    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = '';
    }
  };

  // Add new variant
  const handleAddVariant = async () => {
    if (!newVariantName.trim()) {
      toast.error('Variant name is required');
      return;
    }

    const price = parseFloat(newVariantPrice);

    if (isNaN(price) || price < 0) {
      toast.error('Valid price is required');
      return;
    }

    let imageUrl = '';
    let additionalImages: string[] = [];
    if (newVariantImageFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploadedImages = await uploadMultipleImages(newVariantImageFiles, 'products');
        imageUrl = uploadedImages[0] || '';
        additionalImages = uploadedImages.slice(1);
        toast.success('Variant images uploaded!');
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
      current_stock: 0,
      image_url: imageUrl,
      additional_images: additionalImages,
      isNew: true // Flag to indicate this needs to be created in DB
    };

    setVariants(prev => [...prev, newVariant]);
    setNewVariantName('');
    setNewVariantPrice('');
    setNewVariantImageFiles([]);
    setNewVariantImagePreviews([]);
    
    if (variantImageInputRef.current) {
      variantImageInputRef.current.value = '';
    }

    toast.success('Variant added (will be saved with item)');
  };

  // Remove variant
  const handleRemoveVariant = (index: number) => {
    setVariants(prev => {
      const target = prev[index];
      if (target?.id && !target.isNew) {
        setDeletedVariantIds(current => [...current, target.id]);
      }
      return prev.filter((_, i) => i !== index);
    });
    toast.success('Variant removed');
  };

  const handleVariantChange = (index: number, field: string, value: string) => {
    setVariants(prev => prev.map((variant, i) => {
      if (i !== index) return variant;
      if (field === 'variant_name') return { ...variant, variant_name: value };
      if (field === 'selling_price') return { ...variant, selling_price: value === '' ? '' : parseFloat(value) };
      if (field === 'current_stock') return variant;
      return variant;
    }));
  };

  const handleVariantAdditionalImages = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadMultipleImages(validFiles, 'products');
      setVariants(prev => prev.map((variant, i) => {
        if (i !== index) return variant;
        const currentAdditional = Array.isArray(variant.additional_images)
          ? variant.additional_images
          : (variant.additional_images ? JSON.parse(variant.additional_images) : []);
        const combinedAdditional = [...currentAdditional, ...uploaded.filter(url => url !== variant.image_url)];
        return {
          ...variant,
          image_url: variant.image_url || uploaded[0] || '',
          additional_images: combinedAdditional
        };
      }));
      toast.success('Variant images added');
    } catch (error) {
      console.error('Error uploading variant images:', error);
      toast.error((error as Error).message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
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
        setVariants([]);
        setDeletedVariantIds([]);
        setFormData(prev => ({ ...prev, sellingPrice: '0', specifications: '' }));
      } else {
        setFormData(prev => ({ ...prev, purchaseCost: '0', purchasedDate: '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== FORM SUBMIT DEBUG ===');
    console.log('activeTab:', activeTab);
    console.log('defaultCategory:', defaultCategory);
    console.log('formData.itemCategory:', formData.itemCategory);
    
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
      const totalVariantStock = variants.reduce((sum, variant) => sum + Number(variant.current_stock || 0), 0);
      const mainStockValue = activeTab === 'Selling'
        ? 0
        : (variants.length > 0 ? totalVariantStock : Math.max(0, parseInt(formData.mainStock || '0')));
      const baseItemData: any = {
        name: formData.name,
        description: formData.description,
        unit_of_measure: formData.unitOfMeasure,
        item_category: activeTab,
        image_url: uploadedMainImageUrl || undefined,
        is_active: formData.isActive,
      };

      // Crafting item specific fields
      if (activeTab === 'Crafting') {
        const purchaseCost = parseFloat(formData.purchaseCost);
        if (isNaN(purchaseCost) || purchaseCost < 0) {
          toast.error('Purchase cost must be a positive number');
          return;
        }

        baseItemData.purchase_cost = purchaseCost;
        baseItemData.selling_price = 0; // Not used for crafting items
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
        baseItemData.is_website_item = true; // ALWAYS TRUE for Selling items
        baseItemData.item_type = 'Finished Products';
        baseItemData.weight = 0; // Removed from UI
        baseItemData.specifications = formData.specifications || undefined;
        
        console.log('SELLING ITEM - baseItemData.is_website_item set to:', baseItemData.is_website_item);
      }

      // CRITICAL: Force is_website_item to TRUE for ALL Selling items
      // This must be set explicitly to ensure database receives the correct value
      const isSellingItem = (activeTab === 'Selling' || baseItemData.item_category === 'Selling');
      const isWebsiteItemValue = isSellingItem === true ? true : false;
      
      console.log('=== PAYLOAD DEBUG ===');
      console.log('activeTab:', activeTab);
      console.log('baseItemData.item_category:', baseItemData.item_category);
      console.log('baseItemData.is_website_item:', baseItemData.is_website_item);
      console.log('isSellingItem:', isSellingItem);
      console.log('FINAL isWebsiteItemValue:', isWebsiteItemValue);
      
      const mainItemPayload = {
        name: baseItemData.name,
        description: baseItemData.description,
        unit_of_measure: baseItemData.unit_of_measure,
        item_category: baseItemData.item_category,
        image_url: baseItemData.image_url || null,
        is_active: baseItemData.is_active,
        purchase_cost: baseItemData.purchase_cost,
        selling_price: baseItemData.selling_price,
        purchased_date: baseItemData.purchased_date || null,
        is_website_item: isWebsiteItemValue, // MUST be true for Selling items
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
      
      console.log('=== FINAL PAYLOAD ===');
      console.log('mainItemPayload.is_website_item:', mainItemPayload.is_website_item, '(type:', typeof mainItemPayload.is_website_item, ')');
      console.log('mainItemPayload.item_category:', mainItemPayload.item_category);

      let parentItemId = id;

      if (isEditMode && id) {
        // Update main item
        await supabase
          .from('inventory_items')
          .update(mainItemPayload)
          .eq('id', id);
        
        toast.success('Item updated successfully');
      } else {
        // Create new main item
        console.log('=== INSERTING TO DATABASE ===');
        console.log('Payload being inserted:', JSON.stringify(mainItemPayload, null, 2));
        
        const { data: newItem, error: itemError } = await supabase
          .from('inventory_items')
          .insert([mainItemPayload])
          .select('*')
          .single();

        if (itemError) {
          console.error('Insert error:', itemError);
          throw itemError;
        }
        
        console.log('Created item from database:', JSON.stringify(newItem, null, 2));
        parentItemId = newItem.id;
        
        toast.success('Item added successfully');
      }

      // Handle variants for selling items
      if (activeTab === 'Selling') {
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
                selling_price: Number(variant.selling_price || 0),
                current_stock: 0,
                purchase_cost: 0,
                image_url: variant.image_url || formData.imageUrl,
                additional_images: JSON.stringify(variant.additional_images || []),
                is_active: true,
                is_variant: true,
                parent_item_id: parentItemId,
                item_type: 'Finished Products',
                is_website_item: true,
                reorder_level: 0,
                sku: '',
                business_id: '550e8400-e29b-41d4-a716-446655440000'
              }]);
          } else if (variant.id) {
            // Update existing variant
            await supabase
              .from('inventory_items')
              .update({
                variant_name: variant.variant_name,
                selling_price: Number(variant.selling_price || 0),
                current_stock: 0,
                image_url: variant.image_url || formData.imageUrl,
                additional_images: JSON.stringify(variant.additional_images || []),
                is_website_item: true
              })
              .eq('id', variant.id);
          }
        }

        if (deletedVariantIds.length > 0) {
          await supabase
            .from('inventory_items')
            .delete()
            .in('id', deletedVariantIds);
          setDeletedVariantIds([]);
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
                <Hammer className="h-4 w-4" />
                Crafting
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

                  <div className="border-t pt-4 mt-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold">Product Variants</Label>
                        <p className="text-sm text-muted-foreground">
                          Add different variants with individual prices (e.g., Black, Brown, Large)
                        </p>
                      </div>

                      <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="newVariantName">Variant Name</Label>
                            <Input
                              id="newVariantName"
                              placeholder="e.g., Black, Large"
                              value={newVariantName}
                              onChange={(e) => setNewVariantName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="newVariantPrice">Price</Label>
                            <Input
                              id="newVariantPrice"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Price"
                              value={newVariantPrice}
                              onChange={(e) => setNewVariantPrice(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Variant Images (Optional)</Label>
                          <input
                            ref={variantImageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleVariantImageSelect}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => variantImageInputRef.current?.click()}
                            className="w-full"
                            size="sm"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {newVariantImagePreviews.length > 0 ? 'Change Images' : 'Upload Variant Images'}
                          </Button>
                          
                          {newVariantImagePreviews.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              {newVariantImagePreviews.map((preview, previewIndex) => (
                                <div key={previewIndex} className="relative w-16 h-16 border-2 rounded-lg overflow-hidden">
                                  <img
                                    src={preview}
                                    alt={`Variant preview ${previewIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          onClick={handleAddVariant}
                          size="sm"
                          className="w-full"
                          disabled={!newVariantName.trim() || !newVariantPrice || isUploading}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Variant
                        </Button>
                      </div>

                      {variants.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Added Variants:</Label>
                          <div className="space-y-2">
                            {variants.map((variant, index) => (
                              <div
                                key={index}
                                className="relative border-2 rounded-lg p-3 flex items-center gap-3 group"
                              >
                                {(() => {
                                  const additional = Array.isArray(variant.additional_images)
                                    ? variant.additional_images
                                    : (variant.additional_images ? JSON.parse(variant.additional_images) : []);
                                  const images = [variant.image_url, ...additional].filter(Boolean);
                                  return images.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                      {images.slice(0, 3).map((img, imgIndex) => (
                                        <img
                                          key={imgIndex}
                                          src={img}
                                          alt={variant.variant_name}
                                          className="w-12 h-12 object-cover rounded"
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 rounded border border-dashed border-muted-foreground/40 flex items-center justify-center text-xs text-muted-foreground">
                                      No Images
                                    </div>
                                  );
                                })()}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <Input
                                    value={variant.variant_name || ''}
                                    onChange={(e) => handleVariantChange(index, 'variant_name', e.target.value)}
                                    placeholder="Variant name"
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={variant.selling_price ?? ''}
                                    onChange={(e) => handleVariantChange(index, 'selling_price', e.target.value)}
                                    placeholder="Price"
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <input
                                    id={`variant-images-${index}`}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleVariantAdditionalImages(index, e.target.files)}
                                    className="hidden"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`variant-images-${index}`)?.click()}
                                  >
                                    <Upload className="h-3 w-3 mr-2" />
                                    Add Images
                                  </Button>
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveVariant(index)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
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
                </CardContent>
                <CardFooter className="justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      <ShoppingBag className="h-3 w-3 mr-1" />
                      Selling Item
                    </Badge>
                    <span className="text-xs text-muted-foreground">Displayed on website</span>
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
                    <Hammer className="h-5 w-5" />
                    Crafting Item Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Internal items used for crafting - not displayed on website
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
                </CardContent>
                <CardFooter className="justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <Hammer className="h-3 w-3 mr-1" />
                      Crafting Item
                    </Badge>
                    <span className="text-xs text-muted-foreground">Not displayed on website</span>
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
                          {isEditMode ? 'Update Item' : 'Create Crafting Item'}
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
