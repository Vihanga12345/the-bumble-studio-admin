-- Add bill_images column to financial_transactions table
-- Allows storing multiple image URLs for bills, receipts, and invoices

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'financial_transactions' 
        AND column_name = 'bill_images'
    ) THEN
        ALTER TABLE public.financial_transactions 
        ADD COLUMN bill_images text[];
        
        RAISE NOTICE 'Added bill_images column to financial_transactions';
    END IF;
END $$;

COMMENT ON COLUMN public.financial_transactions.bill_images IS 'Array of image URLs for bills, receipts, and invoices';

CREATE INDEX IF NOT EXISTS idx_financial_transactions_with_images 
ON public.financial_transactions(id) 
WHERE bill_images IS NOT NULL;
