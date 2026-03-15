-- 004: Row Level Security policies
-- Following supabase-postgres-best-practices:
--   - Use (SELECT auth.uid()) instead of auth.uid() directly (security-rls-performance)
--   - Helper functions for role checks to avoid repeated subqueries

-- ===== Helper Functions =====

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql SECURITY DEFINER SET search_path = ''
STABLE
AS $$
  SELECT role FROM public.users
  WHERE id = (SELECT auth.uid());
$$;

-- ===== Enable RLS on all tables =====

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ===== users =====

-- All authenticated users can read all user profiles (needed for assignments, lookups)
CREATE POLICY "users_select" ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- Admin can update any user
CREATE POLICY "users_admin_update" ON public.users FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- Admin can insert users
CREATE POLICY "users_admin_insert" ON public.users FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

-- ===== patients =====

-- All authenticated users can read patients
CREATE POLICY "patients_select" ON public.patients FOR SELECT
  TO authenticated
  USING (true);

-- CS, Admin, Dentist can create patients
CREATE POLICY "patients_insert" ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'cs', 'dentist')
  );

-- CS, Admin can update patients
CREATE POLICY "patients_update" ON public.patients FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'cs')
  );

-- ===== suppliers =====

-- All authenticated users can read suppliers
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT
  TO authenticated
  USING (true);

-- Admin, Stock Staff can manage suppliers
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

-- ===== products =====

-- All authenticated users can read products
CREATE POLICY "products_select" ON public.products FOR SELECT
  TO authenticated
  USING (true);

-- Admin, Stock Staff can manage products
CREATE POLICY "products_insert" ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

CREATE POLICY "products_update" ON public.products FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

-- ===== inventory =====

-- All authenticated users can read inventory (needed for shop/ordering)
CREATE POLICY "inventory_select" ON public.inventory FOR SELECT
  TO authenticated
  USING (true);

-- Admin, Stock Staff can manage inventory
CREATE POLICY "inventory_insert" ON public.inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

CREATE POLICY "inventory_update" ON public.inventory FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff', 'assistant')
  );

-- ===== cases =====

-- Dentists see own cases, others see all (based on role)
CREATE POLICY "cases_select" ON public.cases FOR SELECT
  TO authenticated
  USING (
    dentist_id = (SELECT auth.uid())
    OR assistant_id = (SELECT auth.uid())
    OR (SELECT public.get_user_role()) IN ('admin', 'stock_staff', 'cs')
  );

-- CS, Admin, Dentist can create cases
CREATE POLICY "cases_insert" ON public.cases FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'cs', 'dentist')
  );

-- Dentist can update own cases, Admin/CS/Stock/Assistant can update assigned
CREATE POLICY "cases_update" ON public.cases FOR UPDATE
  TO authenticated
  USING (
    dentist_id = (SELECT auth.uid())
    OR assistant_id = (SELECT auth.uid())
    OR (SELECT public.get_user_role()) IN ('admin', 'stock_staff', 'cs')
  );

-- ===== case_reservations =====

-- Users can see reservations for cases they have access to
CREATE POLICY "reservations_select" ON public.case_reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id
      AND (
        c.dentist_id = (SELECT auth.uid())
        OR c.assistant_id = (SELECT auth.uid())
        OR (SELECT public.get_user_role()) IN ('admin', 'stock_staff', 'cs')
      )
    )
  );

-- Dentist, Admin can create reservations
CREATE POLICY "reservations_insert" ON public.case_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'dentist')
  );

-- Stock, Assistant, Admin can update reservations (assign LOT, record usage)
CREATE POLICY "reservations_update" ON public.case_reservations FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff', 'assistant')
    OR reserved_by = (SELECT auth.uid())
  );

-- ===== purchase_orders =====

-- Admin, Stock Staff can see all POs; requesters can see own
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (
    requested_by = (SELECT auth.uid())
    OR (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

-- Admin, Stock Staff can create POs
CREATE POLICY "po_insert" ON public.purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

-- Admin, Stock Staff can update POs
CREATE POLICY "po_update" ON public.purchase_orders FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

-- ===== purchase_order_items =====

-- Same access as PO parent
CREATE POLICY "po_items_select" ON public.purchase_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = po_id
      AND (
        po.requested_by = (SELECT auth.uid())
        OR (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
      )
    )
  );

CREATE POLICY "po_items_insert" ON public.purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

CREATE POLICY "po_items_update" ON public.purchase_order_items FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

CREATE POLICY "po_items_delete" ON public.purchase_order_items FOR DELETE
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'stock_staff')
  );

-- ===== notifications =====

-- Users can only see their own notifications
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- System/server can insert (via service role), admin can insert
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.is_admin())
  );

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ===== audit_logs =====

-- Admin only
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

-- Insert via triggers (any authenticated user, since triggers fire as the user)
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===== app_settings =====

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "app_settings_select" ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Admin only can update settings
CREATE POLICY "app_settings_update" ON public.app_settings FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- Admin only can insert settings
CREATE POLICY "app_settings_insert" ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

-- ===== Storage: case-photos bucket =====

INSERT INTO storage.buckets (id, name, public)
VALUES ('case-photos', 'case-photos', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "auth_upload_case_photos" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'case-photos');

CREATE POLICY "auth_read_case_photos" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'case-photos');
