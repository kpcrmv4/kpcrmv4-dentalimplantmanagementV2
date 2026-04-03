-- 023: Add stock_received enum value
-- Must be committed before the value can be used (see migration 024)

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'stock_received';
