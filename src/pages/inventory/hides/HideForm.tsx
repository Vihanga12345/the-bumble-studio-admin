import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ImageIcon, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useHides } from '@/hooks/useHides';
import { uploadMultipleImages, validateImageFile } from '@/lib/uploadUtils';

const animalTypes = ['Cow', 'Goat', 'Ostrich'] as const;
const leatherGrains = ['Full Grain', 'Top Grain', 'Genuine Leather'] as const;
const finishings = ['Waxed', 'Oil pullup', 'Oil', 'Crazy horse', 'Full veg', 'Semi Veg', 'Chrome tan'] as const;

const HideForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { getHideById, createHide, updateHide, isLoading } = useHides();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    hideName: '',
    isAvailable: true,
    sqFeet: '0',
    price: '0',
    estimatedProductsToBeMade: '1',
    animalType: 'Cow',
    leatherGrain: 'Full Grain',
    country: '',
    finishing: 'Full veg',
    notes: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditMode || !id || isLoading) return;
    const hide = getHideById(id);
    if (!hide) return;
    setFormData({
      hideName: hide.hideName,
      isAvailable: hide.isAvailable,
      sqFeet: String(hide.sqFeet),
      price: String(hide.price),
      estimatedProductsToBeMade: String(hide.estimatedProductsToBeMade || 1),
      animalType: hide.animalType || 'Cow',
      leatherGrain: hide.leatherGrain || 'Full Grain',
      country: hide.country || '',
      finishing: hide.finishing,
      notes: hide.notes || '',
    });
    setImages(hide.imageUrls || []);
  }, [getHideById, id, isEditMode, isLoading]);

  const handleUploadImages = async (fileList: FileList | null) => {
    if (!fileList) return;
    const selected = Array.from(fileList);
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      toast.error('You can upload up to 5 images only');
      return;
    }

    const valid: File[] = [];
    for (const file of selected) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        continue;
      }
      valid.push(file);
      if (valid.length >= remaining) break;
    }
    if (!valid.length) return;

    try {
      const urls = await uploadMultipleImages(valid, 'hides');
      setImages((prev) => [...prev, ...urls].slice(0, 5));
      toast.success('Images uploaded');
    } catch (error) {
      console.error('Failed to upload hide images:', error);
      toast.error('Failed to upload hide images');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReplaceImage = async (index: number, fileList: FileList | null) => {
    if (!fileList?.[0]) return;
    const validation = validateImageFile(fileList[0]);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }
    try {
      const urls = await uploadMultipleImages([fileList[0]], 'hides');
      setImages((prev) => {
        const next = [...prev];
        next[index] = urls[0];
        return next;
      });
      toast.success('Image replaced');
    } catch (error) {
      console.error('Failed to replace image:', error);
      toast.error('Failed to replace image');
    } finally {
      setReplaceIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hideName.trim()) {
      toast.error('Hide name is required');
      return;
    }

    const sqFeet = Number(formData.sqFeet);
    const price = Number(formData.price);
    const estimatedProductsToBeMade = Number(formData.estimatedProductsToBeMade);
    if (
      Number.isNaN(sqFeet) ||
      sqFeet < 0 ||
      Number.isNaN(price) ||
      price < 0 ||
      Number.isNaN(estimatedProductsToBeMade) ||
      estimatedProductsToBeMade <= 0
    ) {
      toast.error('Enter valid numeric values');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        hideName: formData.hideName.trim(),
        isAvailable: formData.isAvailable,
        sqFeet,
        price,
        estimatedProductsToBeMade,
        animalType: formData.animalType as any,
        leatherGrain: formData.leatherGrain as any,
        country: formData.country.trim() || null,
        finishing: formData.finishing as any,
        notes: formData.notes,
        imageUrls: images,
      };

      if (isEditMode && id) {
        await updateHide(id, payload);
      } else {
        await createHide(payload as any);
      }
      navigate('/inventory/hides');
    } catch (error) {
      console.error('Failed to save hide:', error);
      toast.error((error as Error).message || 'Failed to save hide');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/inventory/hides')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Hide' : 'Create Hide'}</h1>
          </div>

          <Card>
            <form onSubmit={handleSave}>
              <CardHeader>
                <CardTitle>Hide Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hideName">Hide Name</Label>
                  <Input
                    id="hideName"
                    value={formData.hideName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hideName: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hide Images (max 5)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleUploadImages(e.target.files)}
                  />
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (replaceIndex !== null && e.target.files) handleReplaceImage(replaceIndex, e.target.files);
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Images
                  </Button>
                  {images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {images.map((url, idx) => (
                        <div key={`${url}-${idx}`} className="relative group aspect-square border rounded-lg overflow-hidden bg-muted">
                          <img src={url} alt={`Hide ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setReplaceIndex(idx);
                                replaceInputRef.current?.click();
                              }}
                            >
                              <ImageIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 border rounded-lg border-dashed bg-muted/30">
                      <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No images yet. Upload up to 5 images.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sqFeet">Hide Size (Square Feet)</Label>
                    <Input
                      id="sqFeet"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.sqFeet}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sqFeet: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Hide Cost</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costPerSingleProduct">Hide Cost Per Piece</Label>
                  <Input
                    id="costPerSingleProduct"
                    type="number"
                    value={(
                      ((Number(formData.price) || 0) * (2 * 0.67134509269)) /
                      Math.max(Number(formData.sqFeet) || 1, 1)
                    ).toFixed(2)}
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Formula: Hide Cost x (2 x 0.67134509269) / Hide Size (sq ft)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Animal</Label>
                    <Select value={formData.animalType} onValueChange={(value) => setFormData((prev) => ({ ...prev, animalType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {animalTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Grain</Label>
                    <Select value={formData.leatherGrain} onValueChange={(value) => setFormData((prev) => ({ ...prev, leatherGrain: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {leatherGrains.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                      placeholder="e.g. Sri Lanka, India"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Finishing</Label>
                    <Select value={formData.finishing} onValueChange={(value) => setFormData((prev) => ({ ...prev, finishing: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {finishings.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={formData.isAvailable}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isAvailable: checked }))}
                    id="isAvailable"
                  />
                  <Label htmlFor="isAvailable">{formData.isAvailable ? 'Available' : 'Not Available'}</Label>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/inventory/hides')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : isEditMode ? 'Update Hide' : 'Create Hide'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default HideForm;
