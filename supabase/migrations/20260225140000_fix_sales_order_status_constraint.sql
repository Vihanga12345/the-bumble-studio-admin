-- Fix sales_orders.status constraint to allow all values used by:
-- 1) ManualSalesOrder fulfillment workflow: Order Confirmed, Leathers Selected, Cut Pieces, Stitching, Burnishing, Packed, Remaining Amount Paid, Delivered
-- 2) SalesOrderDetail / CreateSalesOrder: pending, processing, completed, cancelled, shipped, delivered, confirmed, draft

ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;

ALTER TABLE public.sales_orders
ADD CONSTRAINT sales_orders_status_check
CHECK (status IN (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'draft',
  'Order Confirmed', 'Leathers Selected', 'Cut Pieces', 'Stitching', 'Burnishing', 'Packed', 'Remaining Amount Paid', 'Delivered'
));
