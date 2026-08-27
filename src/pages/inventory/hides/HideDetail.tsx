import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Upload, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useHides } from '@/hooks/useHides';
import { useInventory } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { uploadMultipleImages, validateImageFile } from '@/lib/uploadUtils';

interface HideUsageRow {
  id: string;
  soNumber: string;
  soDate: string;
  soTotalAmount: number;
  sellingItemName: string;
  pieces: number;
  pricePerPiece: number;
  incomeFromHide: number;
}

const HideDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getHideById, updateHide, hides } = useHides();
  const { items } = useInventory();
  const sellingItems = items.filter((item) => item.itemCategory === 'Selling');
  const [isSaving, setIsSaving] = useState(false);
  const [usageRows, setUsageRows] = useState<HideUsageRow[]>([]);
  const [itemFilter, setItemFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const hide = id ? getHideById(id) : undefined;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    hideName: '',
    isAvailable: true,
    sqFeet: '0',
    price: '0',
    animalType: 'Cow',
    leatherGrain: 'Full Grain',
    country: '',
    finishing: 'Full veg',
  });
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!hide) return;
    setFormData({
      hideName: hide.hideName,
      isAvailable: hide.isAvailable,
      sqFeet: String(hide.sqFeet),
      price: String(hide.price),
      animalType: hide.animalType || 'Cow',
      leatherGrain: hide.leatherGrain || 'Full Grain',
      country: hide.country || '',
      finishing: hide.finishing,
    });
    setImages(Array.isArray(hide.imageUrls) ? [...hide.imageUrls] : []);
  }, [hide, hides.length]);

  const handleUploadImages = async (fileList: FileList | null) => {
    if (!fileList) return;
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      toast.error('You can upload up to 5 images only');
      return;
    }
    const selected = Array.from(fileList);
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

  useEffect(() => {
    const fetchUsage = async () => {
      if (!id) return;
      const { data, error } = await (supabase as any)
        .from('sales_order_hides')
        .select(`
          id,
          quantity,
          unit_cost_per_product,
          product_id,
          sales_orders(order_number, total_amount, order_date),
          inventory_items(name)
        `)
        .eq('hide_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading hide usage:', error);
        toast.error('Failed to load hide usage report');
        return;
      }

      const rows: HideUsageRow[] = (data || []).map((row: any) => {
        const pieces = Number(row.quantity || 0);
        const pricePerPiece = Number(row.unit_cost_per_product || 0);
        return {
          id: row.id,
          soNumber: row.sales_orders?.order_number || '-',
          soDate: row.sales_orders?.order_date || '',
          soTotalAmount: Number(row.sales_orders?.total_amount || 0),
          sellingItemName: row.inventory_items?.name || 'Unmapped Item',
          pieces,
          pricePerPiece,
          incomeFromHide: pieces * pricePerPiece,
        };
      });
      setUsageRows(rows);
    };
    fetchUsage();
  }, [hide?.price, id]);

  const filteredUsage = useMemo(() => {
    return usageRows.filter((row) => {
      const byItem = itemFilter === 'all' || row.sellingItemName === itemFilter;
      const rowDate = row.soDate ? new Date(row.soDate) : null;
      const byFrom = !fromDate || (rowDate && rowDate >= new Date(`${fromDate}T00:00:00`));
      const byTo = !toDate || (rowDate && rowDate <= new Date(`${toDate}T23:59:59`));
      return byItem && byFrom && byTo;
    });
  }, [fromDate, itemFilter, toDate, usageRows]);

  if (!hide || !id) {
    return (
      <Layout>
        <div className="container mx-auto py-10">
          <Button onClick={() => navigate('/inventory/hides')}>Back to Hides</Button>
        </div>
      </Layout>
    );
  }

  const totalPieces = filteredUsage.reduce((sum, row) => sum + row.pieces, 0);
  const totalIncome = filteredUsage.reduce((sum, row) => sum + row.incomeFromHide, 0);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateHide(id, {
        hideName: formData.hideName,
        isAvailable: formData.isAvailable,
        sqFeet: Number(formData.sqFeet),
        price: Number(formData.price),
        animalType: formData.animalType as any,
        leatherGrain: formData.leatherGrain as any,
        country: formData.country.trim() || null,
        finishing: formData.finishing as any,
        imageUrls: images,
      });
    } catch (error) {
      console.error('Error saving hide:', error);
      toast.error('Failed to save hide');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/inventory/hides')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Hide Details</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hide Images</CardTitle>
              <p className="text-sm text-muted-foreground">Upload, replace or remove images (max 5)</p>
            </CardHeader>
            <CardContent>
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
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="mb-4">
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
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                  <ImageIcon className="h-16 w-16 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">No images yet</p>
                  <p className="text-xs text-muted-foreground">Click Upload Images above to add up to 5 photos</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit Hide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hide Name</Label>
                  <Input value={formData.hideName} onChange={(e) => setFormData((prev) => ({ ...prev, hideName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>SQ Feet</Label>
                  <Input type="number" value={formData.sqFeet} onChange={(e) => setFormData((prev) => ({ ...prev, sqFeet: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input type="number" value={formData.price} onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Animal</Label>
                  <Select value={formData.animalType} onValueChange={(value) => setFormData((prev) => ({ ...prev, animalType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cow">Cow</SelectItem>
                      <SelectItem value="Goat">Goat</SelectItem>
                      <SelectItem value="Ostrich">Ostrich</SelectItem>
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
                      <SelectItem value="Full Grain">Full Grain</SelectItem>
                      <SelectItem value="Top Grain">Top Grain</SelectItem>
                      <SelectItem value="Genuine Leather">Genuine Leather</SelectItem>
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
                      <SelectItem value="Waxed">Waxed</SelectItem>
                      <SelectItem value="Oil pullup">Oil pullup</SelectItem>
                      <SelectItem value="Oil">Oil</SelectItem>
                      <SelectItem value="Crazy horse">Crazy horse</SelectItem>
                      <SelectItem value="Full veg">Full veg</SelectItem>
                      <SelectItem value="Semi Veg">Semi Veg</SelectItem>
                      <SelectItem value="Chrome tan">Chrome tan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={formData.isAvailable} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isAvailable: checked }))} />
                <Label>{formData.isAvailable ? 'Available' : 'Not Available'}</Label>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hide Usage Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={itemFilter} onValueChange={setItemFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search by item type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Selling Items</SelectItem>
                    {sellingItems.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Selling Item Name</TableHead>
                    <TableHead className="text-right">SO Total Amount</TableHead>
                    <TableHead className="text-right">Pieces</TableHead>
                    <TableHead className="text-right">Price Per Piece</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsage.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.soNumber}</TableCell>
                      <TableCell>{row.sellingItemName}</TableCell>
                      <TableCell className="text-right">Rs {row.soTotalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{row.pieces.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Rs {row.pricePerPiece.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Rs {row.incomeFromHide.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredUsage.length > 0 && (
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell colSpan={3} className="text-right">Total</TableCell>
                      <TableCell className="text-right">{totalPieces.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">Rs {totalIncome.toFixed(2)}</TableCell>
                    </TableRow>
                  )}
                  {filteredUsage.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No linked sales orders for this hide in selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex justify-end gap-6 text-sm">
                <div>Total Pieces: <span className="font-semibold">{totalPieces.toFixed(2)}</span></div>
                <div>Total (Price Per Piece × Qty): <span className="font-semibold">Rs {totalIncome.toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default HideDetail;
