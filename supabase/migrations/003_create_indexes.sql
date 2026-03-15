-- 003: Create indexes
-- Following supabase-postgres-best-practices:
--   - Index every FK column (schema-foreign-key-indexes)
--   - Composite indexes: equality columns first, range columns last (query-composite-indexes)
--   - Covering indexes with INCLUDE (query-covering-indexes)
--   - Partial indexes for filtered queries (query-partial-indexes)

-- ===== FK Indexes =====

-- patients
CREATE INDEX idx_patients_created_by ON public.patients(created_by);

-- products
CREATE INDEX idx_products_supplier_id ON public.products(supplier_id);

-- inventory
CREATE INDEX idx_inventory_product_id ON public.inventory(product_id);
CREATE INDEX idx_inventory_po_id ON public.inventory(po_id);

-- cases
CREATE INDEX idx_cases_patient_id ON public.cases(patient_id);
CREATE INDEX idx_cases_dentist_id ON public.cases(dentist_id);
CREATE INDEX idx_cases_assistant_id ON public.cases(assistant_id);
CREATE INDEX idx_cases_created_by ON public.cases(created_by);

-- case_reservations
CREATE INDEX idx_reservations_case_id ON public.case_reservations(case_id);
CREATE INDEX idx_reservations_product_id ON public.case_reservations(product_id);
CREATE INDEX idx_reservations_inventory_id ON public.case_reservations(inventory_id);
CREATE INDEX idx_reservations_reserved_by ON public.case_reservations(reserved_by);
CREATE INDEX idx_reservations_prepared_by ON public.case_reservations(prepared_by);

-- purchase_orders
CREATE INDEX idx_po_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX idx_po_requested_by ON public.purchase_orders(requested_by);
CREATE INDEX idx_po_approved_by ON public.purchase_orders(approved_by);

-- purchase_order_items
CREATE INDEX idx_po_items_po_id ON public.purchase_order_items(po_id);
CREATE INDEX idx_po_items_product_id ON public.purchase_order_items(product_id);

-- notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- audit_logs
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs(performed_by);

-- ===== Composite Indexes (equality first, range last) =====

-- Cases: filter by status, sort by date
CREATE INDEX idx_cases_status_date ON public.cases(case_status, scheduled_date);

-- Inventory: FIFO query (product + expiry order) with covering columns
CREATE INDEX idx_inventory_product_expiry ON public.inventory(product_id, expiry_date NULLS LAST)
  INCLUDE (quantity, reserved_quantity, lot_number);

-- Notifications: user's unread notifications sorted by date
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);

-- Audit logs: entity lookup
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(table_name, record_id);

-- Audit logs: time-based queries
CREATE INDEX idx_audit_logs_time ON public.audit_logs(performed_at DESC);

-- ===== Partial Indexes =====

-- Active cases only (excludes completed/cancelled)
CREATE INDEX idx_cases_active ON public.cases(scheduled_date)
  WHERE case_status NOT IN ('completed', 'cancelled');

-- Pending POs only
CREATE INDEX idx_po_pending ON public.purchase_orders(created_at)
  WHERE status IN ('draft', 'pending_approval');

-- Inventory with available stock
CREATE INDEX idx_inventory_available ON public.inventory(product_id)
  WHERE quantity > 0;

-- Active products only
CREATE INDEX idx_products_active ON public.products(category)
  WHERE is_active = true;

-- Unread notifications
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, created_at DESC)
  WHERE is_read = false;

-- Invoice number search
CREATE INDEX idx_inventory_invoice_number ON public.inventory(invoice_number)
  WHERE invoice_number IS NOT NULL;

-- PO expected delivery date (overdue tracking)
CREATE INDEX idx_po_expected_delivery ON public.purchase_orders(expected_delivery_date)
  WHERE status = 'ordered' AND expected_delivery_date IS NOT NULL;
