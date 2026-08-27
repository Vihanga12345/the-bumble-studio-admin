import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCrafterHourlyRate, getCrafterProfitMargin, setCrafterHourlyRate, setCrafterProfitMargin } from "@/lib/crafterSettings";

interface CrafterActivityRow {
  id: string;
  salesOrderId: string;
  salesOrderNumber: string;
  orderDate: string;
  customerName: string;
  itemName: string;
  itemLine: string;
  hoursSpent: number;
  quantity: number;
  crafterFeeWithdrawn: boolean;
}

const toMonthInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getMonthRange = (monthValue: string) => {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const endExclusive = new Date(year, month, 1);
  return { start, endExclusive };
};

const getMonthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const CrafterDetails = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string>(toMonthInput(new Date()));
  const [searchTerm, setSearchTerm] = useState("");
  const [hourlyRate, setHourlyRateInput] = useState<number>(200);
  const [profitMarginPercentage, setProfitMarginPercentage] = useState<number>(150);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [rows, setRows] = useState<CrafterActivityRow[]>([]);
  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(toMonthInput(date));
    }
    return options;
  }, []);

  const loadHourlyRate = useCallback(async () => {
    const [rate, margin] = await Promise.all([getCrafterHourlyRate(), getCrafterProfitMargin()]);
    setHourlyRateInput(rate);
    setProfitMarginPercentage(margin);
  }, []);

  const loadCrafterRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const { start, endExclusive } = getMonthRange(selectedMonth);

      const { data: ordersData, error: ordersError } = await (supabase as any)
        .from("sales_orders")
        .select("id, order_number, customer_name, order_date, number_of_hours")
        .gte("order_date", start.toISOString())
        .lt("order_date", endExclusive.toISOString())
        .order("order_date", { ascending: false });

      if (ordersError) throw ordersError;

      const orders = ordersData || [];
      const orderMap = new Map<string, any>(orders.map((order: any) => [order.id, order]));
      const orderIds = orders.map((order: any) => order.id);

      const { data: hideLinksData, error: hideLinksError } = await (supabase as any)
        .from("sales_order_hides")
        .select(
          "id, sales_order_id, hide_id, product_id, quantity, man_hours, crafter_fee_withdrawn, crafter_fee_withdrawn_month"
        )
        .in("sales_order_id", orderIds)
        .gt("man_hours", 0);

      if (hideLinksError) throw hideLinksError;

      const hideLinks = hideLinksData || [];
      const orderIdsWithHideHours = new Set(hideLinks.map((row: any) => row.sales_order_id));

      const hideIds = Array.from(new Set(hideLinks.map((row: any) => row.hide_id).filter(Boolean)));
      const productIds = Array.from(new Set(hideLinks.map((row: any) => row.product_id).filter(Boolean)));

      let hidesMap = new Map<string, string>();
      let productsMap = new Map<string, string>();

      if (hideIds.length > 0) {
        const { data: hidesData } = await (supabase as any)
          .from("hides")
          .select("id, hide_name")
          .in("id", hideIds);
        hidesMap = new Map((hidesData || []).map((h: any) => [h.id, h.hide_name]));
      }

      if (productIds.length > 0) {
        const { data: productsData } = await (supabase as any)
          .from("inventory_items")
          .select("id, name")
          .in("id", productIds);
        productsMap = new Map((productsData || []).map((p: any) => [p.id, p.name]));
      }

      const mappedRows: CrafterActivityRow[] = hideLinks.map((row: any) => {
        const order = orderMap.get(row.sales_order_id);
        const productName = row.product_id ? productsMap.get(row.product_id) || "Unknown Item" : "Unlinked Item";
        const hideName = row.hide_id ? hidesMap.get(row.hide_id) || "Unknown Hide" : "No Hide";

        return {
          id: row.id,
          salesOrderId: row.sales_order_id,
          salesOrderNumber: order?.order_number || "-",
          orderDate: order?.order_date || "",
          customerName: order?.customer_name || "Walk-in Customer",
          itemName: productName,
          itemLine: `${productName} / ${hideName}`,
          hoursSpent: Number(row.man_hours || 0),
          quantity: Number(row.quantity || 0),
          crafterFeeWithdrawn: Boolean(row.crafter_fee_withdrawn),
        };
      });

      for (const order of orders) {
        const orderHours = Number(order.number_of_hours || 0);
        if (orderHours > 0 && !orderIdsWithHideHours.has(order.id)) {
          mappedRows.push({
            id: `order-level-${order.id}`,
            salesOrderId: order.id,
            salesOrderNumber: order.order_number || "-",
            orderDate: order.order_date || "",
            customerName: order.customer_name || "Walk-in Customer",
            itemName: "Order-level hours",
            itemLine: "Order-level hours",
            hoursSpent: orderHours,
            quantity: 1,
            crafterFeeWithdrawn: false,
          });
        }
      }

      setRows(mappedRows);
    } catch (error) {
      console.error("Error loading crafter activity:", error);
      toast.error("Failed to load crafter activity");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadHourlyRate();
  }, [loadHourlyRate]);

  useEffect(() => {
    loadCrafterRows();
  }, [loadCrafterRows]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.salesOrderNumber, row.customerName, row.itemName, row.itemLine].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  }, [rows, searchTerm]);

  const totalHoursAll = rows.reduce((sum, row) => sum + row.hoursSpent, 0);
  const totalHoursFiltered = filteredRows.reduce((sum, row) => sum + row.hoursSpent, 0);
  const totalFeeAll = totalHoursAll * hourlyRate;
  const totalFeeFiltered = totalHoursFiltered * hourlyRate;
  const canWithdraw = rows.some((row) => !row.crafterFeeWithdrawn);
  const monthRange = getMonthRange(selectedMonth);

  const handleSaveHourlyRate = async () => {
    if (hourlyRate < 0) {
      toast.error("Hourly rate cannot be negative");
      return;
    }
    if (profitMarginPercentage < 0) {
      toast.error("Profit margin cannot be negative");
      return;
    }
    setIsSavingRate(true);
    try {
      const [rate, margin] = await Promise.all([
        setCrafterHourlyRate(hourlyRate),
        setCrafterProfitMargin(profitMarginPercentage),
      ]);
      setHourlyRateInput(rate);
      setProfitMarginPercentage(margin);
      toast.success("Crafter hourly rate updated");
    } catch (error) {
      console.error("Error saving crafter hourly rate:", error);
      toast.error("Failed to save hourly rate");
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleWithdrawMonth = async () => {
    if (!canWithdraw) {
      toast.error("Crafter fee already withdrawn for this month");
      return;
    }

    const confirmed = window.confirm(
      `Withdraw crafter fee for ${selectedMonth}? This marks all eligible entries as withdrawn and creates a finance expense.`
    );
    if (!confirmed) return;

    setIsWithdrawing(true);
    try {
      const { data, error } = await (supabase as any).rpc("withdraw_crafter_fee_for_month", {
        p_withdrawal_month: selectedMonth,
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      toast.success(
        `Withdrawal completed. Total Fee: Rs ${Number(result?.total_fee || 0).toFixed(2)}`
      );
      await loadCrafterRows();
    } catch (error: any) {
      console.error("Error withdrawing crafter fee:", error);
      toast.error(error?.message || "Failed to withdraw crafter fee");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/sales")} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Crafter Details</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Month-wise crafted items, total hours, and crafter fee withdrawals
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={loadCrafterRows} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
            <CardTitle className="text-lg">Crafter Master Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-end">
              <div className="w-full sm:w-72">
                <Label className="mb-1 block">Standard Hourly Rate (Rs)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRateInput(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="w-full sm:w-72">
                <Label className="mb-1 block">Default Profit Margin (%)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={profitMarginPercentage}
                  onChange={(e) => setProfitMarginPercentage(parseFloat(e.target.value) || 0)}
                />
              </div>
              <Button onClick={handleSaveHourlyRate} disabled={isSavingRate}>
                {isSavingRate ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Month Filter & Search</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="mb-1 block">Month (YYYY-MM)</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((monthValue) => (
                      <SelectItem key={monthValue} value={monthValue}>
                        {getMonthLabel(monthValue)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by item, order number, customer"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground md:col-span-3">
                Selected range: {monthRange.start.toLocaleDateString()} to{" "}
                {new Date(monthRange.endExclusive.getTime() - 1).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-sm text-muted-foreground">Selected Month Total Hours</p>
                <p className="text-2xl font-semibold">{totalHoursAll.toFixed(2)} hrs</p>
                <p className="text-sm text-muted-foreground">Hourly Rate: Rs {hourlyRate.toFixed(2)}</p>
                <p className="text-lg font-semibold">Total Crafter Fee: Rs {totalFeeAll.toFixed(2)}</p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-sm text-muted-foreground">Filtered Rows Total Hours</p>
                <p className="text-2xl font-semibold">{totalHoursFiltered.toFixed(2)} hrs</p>
                <p className="text-sm text-muted-foreground">Hourly Rate: Rs {hourlyRate.toFixed(2)}</p>
                <p className="text-lg font-semibold">Filtered Crafter Fee: Rs {totalFeeFiltered.toFixed(2)}</p>
              </div>
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border rounded-md p-3">
                <p className="text-sm text-muted-foreground">
                  Withdraw formula: Total Hours x Standard Hourly Rate
                </p>
                <Button onClick={handleWithdrawMonth} disabled={isWithdrawing || !canWithdraw}>
                  {isWithdrawing ? "Withdrawing..." : "Withdraw Crafter Fee"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Crafted Item Lines</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Order No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Item Line</TableHead>
                    <TableHead className="text-right">Hours Spent</TableHead>
                    <TableHead className="text-right">Hourly Rate</TableHead>
                    <TableHead className="text-right">Line Crafter Cost</TableHead>
                    <TableHead>Crafter Fee Withdrawn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                        Loading crafter data...
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length > 0 ? (
                    filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.salesOrderNumber}</TableCell>
                        <TableCell>{row.orderDate ? new Date(row.orderDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{row.customerName}</TableCell>
                        <TableCell>{row.itemName}</TableCell>
                        <TableCell>{row.itemLine}</TableCell>
                        <TableCell className="text-right">{row.hoursSpent.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Rs {hourlyRate.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          Rs {(row.hoursSpent * hourlyRate).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.crafterFeeWithdrawn ? "secondary" : "outline"}>
                            {row.crafterFeeWithdrawn ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                        No crafted lines found for the selected month.
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

export default CrafterDetails;

