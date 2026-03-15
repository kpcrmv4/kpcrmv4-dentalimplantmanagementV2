-- 002: Create all tables
-- DentalStock Management System

-- Helper: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'assistant',
  phone TEXT,
  line_user_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  line_id TEXT,
  address TEXT,
  lead_time_days INTEGER,
  delivery_score NUMERIC(3,1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  category product_category NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  min_stock_level INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2),
  supplier_id UUID REFERENCES public.suppliers(id),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT positive_min_stock CHECK (min_stock_level >= 0)
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hn TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  gender TEXT,
  allergies TEXT,
  medical_history TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. purchase_orders (created before inventory because inventory references it)
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
  status po_status NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(12,2),
  notes TEXT,
  expected_delivery_date DATE,
  requested_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. purchase_order_items
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  CONSTRAINT positive_po_quantity CHECK (quantity > 0),
  CONSTRAINT positive_unit_price CHECK (unit_price >= 0)
);

-- 7. inventory
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) NOT NULL,
  lot_number TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  expiry_date DATE,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  po_id UUID REFERENCES public.purchase_orders(id),
  invoice_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT positive_quantity CHECK (quantity >= 0),
  CONSTRAINT positive_reserved CHECK (reserved_quantity >= 0),
  CONSTRAINT reserved_not_exceed CHECK (reserved_quantity <= quantity)
);

-- Unique constraint using expression index (COALESCE for NULL expiry_date)
CREATE UNIQUE INDEX idx_inventory_lot_unique
  ON public.inventory(product_id, lot_number, COALESCE(expiry_date, '2099-12-31'));

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. cases
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  dentist_id UUID REFERENCES public.users(id) NOT NULL,
  assistant_id UUID REFERENCES public.users(id),
  scheduled_date DATE,
  scheduled_time TIME,
  case_status case_status NOT NULL DEFAULT 'pending_appointment',
  procedure_type TEXT,
  tooth_positions INTEGER[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. case_reservations
CREATE TABLE public.case_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  inventory_id UUID REFERENCES public.inventory(id),
  quantity_reserved INTEGER NOT NULL,
  quantity_used INTEGER,
  status reservation_status NOT NULL DEFAULT 'reserved',
  reserved_by UUID REFERENCES public.users(id),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  prepared_by UUID REFERENCES public.users(id),
  prepared_at TIMESTAMPTZ,
  lot_specified BOOLEAN NOT NULL DEFAULT false,
  photo_url TEXT,
  photo_uploaded_at TIMESTAMPTZ,

  CONSTRAINT positive_reservation CHECK (quantity_reserved > 0),
  CONSTRAINT positive_used CHECK (quantity_used IS NULL OR quantity_used >= 0)
);

-- 10. notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_via TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. audit_logs (partitioned by month)
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES public.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, performed_at)
) PARTITION BY RANGE (performed_at);

-- Create initial partitions (current year + next year)
CREATE TABLE audit_logs_2026_q1 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE audit_logs_2026_q2 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE audit_logs_2026_q3 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE audit_logs_2026_q4 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE audit_logs_2027_q1 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');

-- 12. app_settings (singleton)
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_webhook_url TEXT,
  emergency_alert_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== Trigger: handle reservation status changes (inventory bookkeeping) =====
CREATE OR REPLACE FUNCTION handle_reservation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Status didn't change, nothing to do
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- reserved → prepared: handle lot change (if inventory_id changed)
  IF NEW.status = 'prepared' AND OLD.status = 'reserved' THEN
    IF OLD.inventory_id IS DISTINCT FROM NEW.inventory_id THEN
      -- Release from old lot
      IF OLD.inventory_id IS NOT NULL THEN
        UPDATE inventory SET reserved_quantity = reserved_quantity - OLD.quantity_reserved
        WHERE id = OLD.inventory_id;
      END IF;
      -- Reserve on new lot
      IF NEW.inventory_id IS NOT NULL THEN
        UPDATE inventory SET reserved_quantity = reserved_quantity + NEW.quantity_reserved
        WHERE id = NEW.inventory_id;
      END IF;
    END IF;
  END IF;

  -- consumed → deduct from inventory
  IF NEW.status = 'consumed' AND OLD.status != 'consumed' THEN
    IF NEW.inventory_id IS NOT NULL THEN
      UPDATE inventory SET
        quantity = quantity - COALESCE(NEW.quantity_used, NEW.quantity_reserved),
        reserved_quantity = reserved_quantity - NEW.quantity_reserved
      WHERE id = NEW.inventory_id;
    END IF;
  END IF;

  -- returned → release reservation
  IF NEW.status = 'returned' AND OLD.status IN ('reserved', 'prepared') THEN
    IF OLD.inventory_id IS NOT NULL THEN
      UPDATE inventory SET reserved_quantity = reserved_quantity - OLD.quantity_reserved
      WHERE id = OLD.inventory_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservation_status_change
  AFTER UPDATE ON public.case_reservations
  FOR EACH ROW EXECUTE FUNCTION handle_reservation_status_change();

-- ===== Trigger: audit log =====
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, performed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$;

-- Audit triggers on key tables
CREATE TRIGGER audit_cases
  AFTER INSERT OR UPDATE OR DELETE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_case_reservations
  AFTER INSERT OR UPDATE OR DELETE ON public.case_reservations
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- ===== RPC: Batch create reservations with FEFO + FOR UPDATE lock =====
CREATE OR REPLACE FUNCTION create_reservations_batch(
  p_case_id UUID,
  p_items JSONB,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  item JSONB;
  v_product_id UUID;
  v_quantity INT;
  v_inv_id UUID;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::INT;

    -- Find best FEFO lot with sufficient stock (lock row)
    SELECT id INTO v_inv_id
    FROM inventory
    WHERE product_id = v_product_id
      AND quantity - reserved_quantity >= v_quantity
    ORDER BY expiry_date NULLS LAST, received_date ASC
    LIMIT 1
    FOR UPDATE;

    -- Create reservation
    INSERT INTO case_reservations (
      case_id, product_id, inventory_id, quantity_reserved,
      status, reserved_by, reserved_at
    ) VALUES (
      p_case_id, v_product_id, v_inv_id, v_quantity,
      'reserved', p_user_id, now()
    );

    -- If lot found, increment reserved_quantity
    IF v_inv_id IS NOT NULL THEN
      UPDATE inventory
      SET reserved_quantity = reserved_quantity + v_quantity
      WHERE id = v_inv_id;
    END IF;
  END LOOP;
END;
$$;

-- ===== RPC: Check product availability =====
CREATE OR REPLACE FUNCTION check_product_availability(p_product_id UUID, p_quantity INT)
RETURNS TABLE(is_available BOOLEAN, total_available BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(SUM(quantity - reserved_quantity), 0) >= p_quantity,
    COALESCE(SUM(quantity - reserved_quantity), 0)
  FROM inventory
  WHERE product_id = p_product_id AND quantity - reserved_quantity > 0;
$$;

-- ===== RPC: Cost per case =====
CREATE OR REPLACE FUNCTION get_cost_per_case(p_case_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(SUM(cr.quantity_used * p.cost_price), 0)
  FROM case_reservations cr
  JOIN products p ON p.id = cr.product_id
  WHERE cr.case_id = p_case_id AND cr.status = 'consumed' AND p.cost_price IS NOT NULL;
$$;

-- ===== RPC: Usage report =====
CREATE OR REPLACE FUNCTION get_usage_report(p_from DATE, p_to DATE)
RETURNS TABLE(
  usage_date DATE, case_id UUID, case_number TEXT, patient_name TEXT, patient_hn TEXT,
  product_name TEXT, product_ref TEXT, product_category TEXT,
  quantity_used INT, unit_cost NUMERIC, total_cost NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT c.scheduled_date, c.id, c.case_number, pat.full_name, pat.hn,
    prod.name, prod.ref, prod.category::TEXT,
    cr.quantity_used, prod.cost_price, (cr.quantity_used * COALESCE(prod.cost_price, 0))
  FROM case_reservations cr
  JOIN cases c ON c.id = cr.case_id
  JOIN patients pat ON pat.id = c.patient_id
  JOIN products prod ON prod.id = cr.product_id
  WHERE cr.status = 'consumed' AND c.scheduled_date BETWEEN p_from AND p_to
  ORDER BY c.scheduled_date, c.case_number;
$$;

-- ===== Supabase Realtime: enable for notifications table =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
