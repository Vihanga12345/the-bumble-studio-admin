-- Cleanup Duplicate Financial Transactions
-- This script removes duplicate financial transaction records
-- Keeps only the most recent transaction for each reference_number + category combination

DO $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- Create a temporary table to identify duplicates
    CREATE TEMP TABLE IF NOT EXISTS duplicate_transactions AS
    SELECT 
        id,
        reference_number,
        category,
        type,
        amount,
        date,
        ROW_NUMBER() OVER (
            PARTITION BY reference_number, category, type 
            ORDER BY date DESC, created_at DESC
        ) as row_num
    FROM public.financial_transactions
    WHERE reference_number IS NOT NULL;

    -- Delete duplicates (keep only the first row for each group)
    WITH deleted AS (
        DELETE FROM public.financial_transactions
        WHERE id IN (
            SELECT id 
            FROM duplicate_transactions 
            WHERE row_num > 1
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;

    -- Drop temporary table
    DROP TABLE IF EXISTS duplicate_transactions;

    -- Report results
    RAISE NOTICE '✅ Cleanup completed!';
    RAISE NOTICE '📊 Deleted % duplicate financial transaction(s)', v_deleted_count;
    
    IF v_deleted_count = 0 THEN
        RAISE NOTICE '✨ No duplicates found - database is clean!';
    END IF;
END $$;

-- Verify the cleanup by showing remaining transactions grouped by reference
DO $$
DECLARE
    v_transaction_count INTEGER;
    v_unique_references INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_transaction_count
    FROM public.financial_transactions
    WHERE reference_number IS NOT NULL;
    
    SELECT COUNT(DISTINCT reference_number) INTO v_unique_references
    FROM public.financial_transactions
    WHERE reference_number IS NOT NULL;
    
    RAISE NOTICE '📈 Current stats:';
    RAISE NOTICE '   - Total financial transactions: %', v_transaction_count;
    RAISE NOTICE '   - Unique reference numbers: %', v_unique_references;
    
    IF v_transaction_count > v_unique_references THEN
        RAISE WARNING '⚠️ There may still be some duplicates. Review manually if needed.';
    END IF;
END $$;
