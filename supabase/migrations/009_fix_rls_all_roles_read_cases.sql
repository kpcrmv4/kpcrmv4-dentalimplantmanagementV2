-- 009: Fix RLS policies so all authenticated users can read cases and reservations
-- Previously, only admin/stock_staff/cs could see all cases.
-- Dentist and assistant could only see cases assigned to them,
-- which caused empty pages when no cases were assigned.

-- Allow ALL authenticated users to read cases
DROP POLICY IF EXISTS "cases_select" ON public.cases;
CREATE POLICY "cases_select" ON public.cases FOR SELECT
  TO authenticated
  USING (true);

-- Allow ALL authenticated users to read case reservations
DROP POLICY IF EXISTS "reservations_select" ON public.case_reservations;
CREATE POLICY "reservations_select" ON public.case_reservations FOR SELECT
  TO authenticated
  USING (true);

-- Allow ALL authenticated users to read purchase orders (needed for dashboard traffic light)
DROP POLICY IF EXISTS "po_select" ON public.purchase_orders;
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (true);

-- Allow ALL authenticated users to read PO items
DROP POLICY IF EXISTS "po_items_select" ON public.purchase_order_items;
CREATE POLICY "po_items_select" ON public.purchase_order_items FOR SELECT
  TO authenticated
  USING (true);
