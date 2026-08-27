import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Minus, Plus, Package, RefreshCw, Search, Warehouse } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { toast } from 'sonner';

const StockManagement = () => {
  const navigate = useNavigate();
  const { items, isLoading, fetchItems, createInventoryAdjustment } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Active Selling (production) parent products — shown on website when isWebsiteItem
  const stockItems = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.itemCategory === 'Selling' &&
            item.isActive &&
            !item.isVariant &&
            !item.parentItemId
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return stockItems;
    return stockItems.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.sku || '').toLowerCase().includes(term) ||
        (item.category || '').toLowerCase().includes(term)
    );
  }, [stockItems, searchTerm]);

  useEffect(() => {
    const next: Record<string, string> = {};
    stockItems.forEach((item) => {
      next[item.id] = String(item.currentStock ?? 0);
    });
    setDraftStock(next);
  }, [stockItems]);

  const getDraftValue = (itemId: string, fallback: number) => {
    const raw = draftStock[itemId];
    if (raw === undefined || raw === '') return fallback;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const persistStock = useCallback(
    async (itemId: string, previousQuantity: number, newQuantity: number, notes: string) => {
      const safeQty = Math.max(0, Math.floor(newQuantity));
      if (safeQty === previousQuantity) {
        setDraftStock((prev) => ({ ...prev, [itemId]: String(previousQuantity) }));
        return;
      }

      setSavingId(itemId);
      try {
        await createInventoryAdjustment(
          itemId,
          previousQuantity,
          safeQty,
          'other',
          notes
        );
        setDraftStock((prev) => ({ ...prev, [itemId]: String(safeQty) }));
      } catch (error) {
        console.error(error);
        setDraftStock((prev) => ({ ...prev, [itemId]: String(previousQuantity) }));
        toast.error('Failed to update stock');
      } finally {
        setSavingId(null);
      }
    },
    [createInventoryAdjustment]
  );

  const handleIncrement = (itemId: string, current: number) => {
    const next = current + 1;
    setDraftStock((prev) => ({ ...prev, [itemId]: String(next) }));
    void persistStock(itemId, current, next, 'Stock increased via Stock Management (+1)');
  };

  const handleDecrement = (itemId: string, current: number) => {
    if (current <= 0) return;
    const next = current - 1;
    setDraftStock((prev) => ({ ...prev, [itemId]: String(next) }));
    void persistStock(itemId, current, next, 'Stock decreased via Stock Management (-1)');
  };

  const handleInputChange = (itemId: string, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setDraftStock((prev) => ({ ...prev, [itemId]: value }));
    }
  };

  const handleInputBlur = (itemId: string, previousQuantity: number) => {
    const raw = draftStock[itemId];
    if (raw === undefined || raw === '') {
      setDraftStock((prev) => ({ ...prev, [itemId]: String(previousQuantity) }));
      return;
    }
    const next = Math.max(0, parseInt(raw, 10) || 0);
    void persistStock(itemId, previousQuantity, next, 'Stock set via Stock Management');
  };

  const getStatus = (qty: number) => {
    if (qty <= 0) return { label: 'Out of Stock', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' };
    if (qty === 1) return { label: 'Low Stock', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' };
    return { label: 'In Stock', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' };
  };

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/inventory')}
              className="mt-0.5 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Warehouse className="h-7 w-7 text-primary" />
                Stock Management
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Set stock for active production (selling) items. Default is 1 for new items. Stock is shown on the website and decreases when a website sale is placed.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => fetchItems()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Production Items</CardTitle>
            <CardDescription>
              {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'} · Use + / − or type a number (including 0)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isLoading && stockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">Loading stock…</p>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No active production items found.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper overflow-x-auto">
                <Table className="admin-responsive-table">
                  <TableHeader className="admin-table-head">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="admin-table-body">
                    {filteredItems.map((item) => {
                      const current = item.currentStock ?? 0;
                      const draft = getDraftValue(item.id, current);
                      const status = getStatus(draft);
                      const busy = savingId === item.id;

                      return (
                        <TableRow key={item.id} className="admin-table-row">
                          <TableCell className="admin-table-td">
                            <div className="flex items-center gap-3 min-w-0">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-10 w-10 rounded object-cover shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium truncate">{item.name}</p>
                                {item.sku ? (
                                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="admin-table-td text-sm text-muted-foreground">
                            {item.category || '—'}
                          </TableCell>
                          <TableCell className="admin-table-td">
                            <Badge variant="outline">
                              {item.isWebsiteItem ? 'Visible' : 'Hidden'}
                            </Badge>
                          </TableCell>
                          <TableCell className="admin-table-td">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell className="admin-table-td">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={busy || draft <= 0}
                                onClick={() => handleDecrement(item.id, current)}
                                aria-label={`Decrease stock for ${item.name}`}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="text"
                                inputMode="numeric"
                                className="w-16 h-8 text-center"
                                value={draftStock[item.id] ?? String(current)}
                                disabled={busy}
                                onChange={(e) => handleInputChange(item.id, e.target.value)}
                                onBlur={() => handleInputBlur(item.id, current)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={busy}
                                onClick={() => handleIncrement(item.id, current)}
                                aria-label={`Increase stock for ${item.name}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StockManagement;
