-- 012: Inventory borrowing and exchange system
-- Supports borrowing from other clinics or suppliers
-- with photo evidence, status tracking, and settlement options

-- 1. Enums
CREATE TYPE borrow_status AS ENUM (
  'borrowed',
  'returned',
  'exchanged',
  'paid',
  'partially_returned'
);

CREATE TYPE borrow_source AS ENUM ('clinic', 'supplier');

-- 2. Main borrow records
CREATE TABLE public.inventory_borrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_number TEXT UNIQUE NOT NULL,
  source_type borrow_source NOT NULL,
  source_name TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  status borrow_status NOT NULL DEFAULT 'borrowed',
  borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  requested_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER inventory_borrows_updated_at
  BEFORE UPDATE ON public.inventory_borrows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Borrow line items
CREATE TABLE public.inventory_borrow_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_id UUID REFERENCES public.inventory_borrows(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  inventory_id UUID REFERENCES public.inventory(id),
  case_id UUID REFERENCES public.cases(id),
  quantity INTEGER NOT NULL,
  status borrow_status NOT NULL DEFAULT 'borrowed',
  settlement_type TEXT,
  settlement_product_id UUID REFERENCES public.products(id),
  settlement_amount NUMERIC(10,2),
  settlement_note TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT positive_borrow_qty CHECK (quantity > 0)
);

-- 4. Photo evidence
CREATE TABLE public.inventory_borrow_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_id UUID REFERENCES public.inventory_borrows(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Indexes
CREATE INDEX idx_borrows_status ON public.inventory_borrows(status);
CREATE INDEX idx_borrows_source ON public.inventory_borrows(source_type);
CREATE INDEX idx_borrow_items_borrow ON public.inventory_borrow_items(borrow_id);
CREATE INDEX idx_borrow_items_case ON public.inventory_borrow_items(case_id);
CREATE INDEX idx_borrow_photos_borrow ON public.inventory_borrow_photos(borrow_id);

-- 6. RLS
ALTER TABLE public.inventory_borrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_borrow_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_borrow_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read borrows" ON public.inventory_borrows
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert borrows" ON public.inventory_borrows
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update borrows" ON public.inventory_borrows
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can read borrow_items" ON public.inventory_borrow_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert borrow_items" ON public.inventory_borrow_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update borrow_items" ON public.inventory_borrow_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can read borrow_photos" ON public.inventory_borrow_photos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert borrow_photos" ON public.inventory_borrow_photos
  FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Audit trigger (only if audit_log_trigger function exists from migration 002)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_log_trigger') THEN
    CREATE TRIGGER audit_inventory_borrows
      AFTER INSERT OR UPDATE OR DELETE ON public.inventory_borrows
      FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
  END IF;
END;
$$;

-- 8. Helper: generate borrow number
CREATE OR REPLACE FUNCTION generate_borrow_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_number TEXT;
  v_count INT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM inventory_borrows;
  v_number := 'BRW' || to_char(now(), 'YYYYMM') || lpad(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$;
