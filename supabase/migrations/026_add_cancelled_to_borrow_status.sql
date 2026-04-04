-- 026: Add 'cancelled' to borrow_status enum
-- Required for cancelling borrow and purchase orders from supplier order system
-- cancelSupplierOrder() sets status = 'cancelled' but the enum value was missing

DO $$ BEGIN
  ALTER TYPE borrow_status ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
