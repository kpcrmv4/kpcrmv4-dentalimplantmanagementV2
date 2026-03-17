-- ============================================================
-- RESET ALL SEEDED DATA
-- Run this in Supabase SQL Editor to clear everything.
-- Safe to re-run: uses TRUNCATE CASCADE.
-- ============================================================

-- Disable triggers to avoid audit log / inventory trigger errors during cleanup
SET session_replication_role = replica;

-- Clear transactional data (child → parent order)
TRUNCATE public.audit_logs CASCADE;
TRUNCATE public.notifications CASCADE;
TRUNCATE public.case_appointment_logs CASCADE;
TRUNCATE public.case_reservations CASCADE;
TRUNCATE public.cases CASCADE;
TRUNCATE public.purchase_order_items CASCADE;
TRUNCATE public.purchase_orders CASCADE;
TRUNCATE public.inventory CASCADE;

-- Clear master data
TRUNCATE public.patients CASCADE;
TRUNCATE public.products CASCADE;
TRUNCATE public.suppliers CASCADE;
TRUNCATE public.app_settings CASCADE;

-- Clear users (public first, then auth)
TRUNCATE public.users CASCADE;
DELETE FROM auth.identities WHERE provider = 'email'
  AND user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.dental');
DELETE FROM auth.users WHERE email LIKE '%@demo.dental';

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Confirm
SELECT 'Reset complete. All seeded data has been cleared.' AS status;
