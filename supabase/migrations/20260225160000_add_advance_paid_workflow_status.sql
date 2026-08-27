-- Add 'Advance Paid' as a workflow status (between Order Confirmed and Leathers Selected)

ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;

ALTER TABLE public.sales_orders
ADD CONSTRAINT sales_orders_status_check
CHECK (status IN (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'draft',
  'Order Confirmed', 'Advance Paid', 'Leathers Selected', 'Cut Pieces', 'Stitching', 'Burnishing', 'Packed', 'Remaining Amount Paid', 'Delivered'
));
