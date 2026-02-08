-- Add bill_images column to financial_transactions table
-- This allows storing multiple image URLs for bills, receipts, and invoices

DO $$
BEGIN
    -- Add bill_images column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_transactions' 
        AND column_name = 'bill_images'
    ) THEN
        ALTER TABLE public.financial_transactions 
        ADD COLUMN bill_images text[];
        
        RAISE NOTICE '✅ Added bill_images column to financial_transactions';
    ELSE
        RAISE NOTICE 'ℹ️  bill_images column already exists in financial_transactions';
    END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN public.financial_transactions.bill_images IS 'Array of image URLs for bills, receipts, and invoices';

-- Create index for better query performance when filtering transactions with images
CREATE INDEX IF NOT EXISTS idx_financial_transactions_with_images 
ON public.financial_transactions(id) 
WHERE bill_images IS NOT NULL;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'financial_transactions' 
AND column_name = 'bill_images';
