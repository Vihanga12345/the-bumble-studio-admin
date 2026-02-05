-- ================================================
-- REMOVE MANUFACTURING FEATURE - SAFE CLEANUP
-- ================================================
-- This script safely removes all manufacturing-related tables,
-- data, constraints, indexes, and references from the ERP system

-- Start transaction
BEGIN;

-- ================================================
-- 1. DROP MANUFACTURING TABLES (SAFE VERSION)
-- ================================================

-- Check and drop production_orders table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders') THEN
        DROP TABLE production_orders CASCADE;
        RAISE NOTICE 'Dropped table: production_orders';
    ELSE
        RAISE NOTICE 'Table production_orders does not exist, skipping...';
    END IF;
END $$;

-- Check and drop bom_materials table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bom_materials') THEN
        DROP TABLE bom_materials CASCADE;
        RAISE NOTICE 'Dropped table: bom_materials';
    ELSE
        RAISE NOTICE 'Table bom_materials does not exist, skipping...';
    END IF;
END $$;

-- Check and drop boms table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'boms') THEN
        DROP TABLE boms CASCADE;
        RAISE NOTICE 'Dropped table: boms';
    ELSE
        RAISE NOTICE 'Table boms does not exist, skipping...';
    END IF;
END $$;

-- Check and drop bill_of_materials table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bill_of_materials') THEN
        DROP TABLE bill_of_materials CASCADE;
        RAISE NOTICE 'Dropped table: bill_of_materials';
    ELSE
        RAISE NOTICE 'Table bill_of_materials does not exist, skipping...';
    END IF;
END $$;

-- Check and drop manufacturing_orders table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manufacturing_orders') THEN
        DROP TABLE manufacturing_orders CASCADE;
        RAISE NOTICE 'Dropped table: manufacturing_orders';
    ELSE
        RAISE NOTICE 'Table manufacturing_orders does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- 2. CLEAN UP INVENTORY ADJUSTMENTS (SAFE)
-- ================================================

-- Check if inventory_adjustments table exists before modifying
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_adjustments') THEN
        -- Remove 'production' reason from inventory adjustments check constraint
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inventory_adjustments_reason_check') THEN
            ALTER TABLE inventory_adjustments DROP CONSTRAINT inventory_adjustments_reason_check;
            RAISE NOTICE 'Dropped constraint: inventory_adjustments_reason_check';
        END IF;
        
        -- Re-create the constraint without 'production'
        ALTER TABLE inventory_adjustments ADD CONSTRAINT inventory_adjustments_reason_check 
            CHECK (reason IN ('damage', 'counting_error', 'return', 'theft', 'other'));
        RAISE NOTICE 'Recreated constraint without production reason';
        
        -- Update any existing records with 'production' reason to 'other'
        UPDATE inventory_adjustments 
        SET reason = 'other', notes = CONCAT(COALESCE(notes, ''), ' [Originally: production adjustment]')
        WHERE reason = 'production';
        RAISE NOTICE 'Updated production adjustments to other';
    ELSE
        RAISE NOTICE 'Table inventory_adjustments does not exist, skipping constraint updates...';
    END IF;
END $$;

-- ================================================
-- 3. CLEAN UP FINANCIAL TRANSACTIONS (SAFE)
-- ================================================

-- Check if financial_transactions table exists before cleaning
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
        DELETE FROM financial_transactions 
        WHERE category = 'manufacturing' OR category = 'production';
        RAISE NOTICE 'Cleaned up manufacturing financial transactions';
    ELSE
        RAISE NOTICE 'Table financial_transactions does not exist, skipping cleanup...';
    END IF;
END $$;

-- ================================================
-- 4. REMOVE MANUFACTURING-RELATED INDEXES (SAFE)
-- ================================================

DROP INDEX IF EXISTS idx_bom_materials_bom_id;
DROP INDEX IF EXISTS idx_bom_materials_item_id;
DROP INDEX IF EXISTS idx_production_orders_business_id;
DROP INDEX IF EXISTS idx_production_orders_bom_id;
DROP INDEX IF EXISTS idx_production_orders_status;
DROP INDEX IF EXISTS idx_boms_business_id;
DROP INDEX IF EXISTS idx_bill_of_materials_business_id;

-- ================================================
-- 5. REMOVE TRIGGERS RELATED TO MANUFACTURING (SAFE)
-- ================================================

DROP TRIGGER IF EXISTS update_boms_updated_at ON boms;
DROP TRIGGER IF EXISTS update_production_orders_updated_at ON production_orders;
DROP TRIGGER IF EXISTS update_bill_of_materials_updated_at ON bill_of_materials;

-- ================================================
-- 6. CLEANUP COMPLETE
-- ================================================

-- Commit the transaction
COMMIT;

-- Display cleanup summary
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MANUFACTURING FEATURE REMOVAL COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Safe cleanup completed - checked table existence before operations';
    RAISE NOTICE 'All manufacturing components have been safely removed';
    RAISE NOTICE '========================================';
END $$; 