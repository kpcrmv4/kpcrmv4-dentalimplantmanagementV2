-- 018: Extend borrow system for case-driven supplier ordering
-- Adds: order_type (borrow/purchase), approval flow, LINE tracking,
-- case linking, return items (flexible product/qty/price), cross-references

-- 1. New enums
DO $$ BEGIN
  CREATE TYPE supplier_order_type AS ENUM ('borrow', 'purchase');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE return_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new columns to inventory_borrows
ALTER TABLE public.inventory_borrows
  ADD COLUMN IF NOT EXISTS order_type supplier_order_type DEFAULT 'borrow',
  ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.cases(id),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS line_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_to_id UUID REFERENCES public.inventory_borrows(id),
  ADD COLUMN IF NOT EXISTS converted_from_id UUID REFERENCES public.inventory_borrows(id),
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;

-- Add 'pending_approval' and 'sent' and 'closed' to borrow_status if not present
-- (PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE, use DO block)
DO $$ BEGIN
  ALTER TYPE borrow_status ADD VALUE IF NOT EXISTS 'pending_approval';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE borrow_status ADD VALUE IF NOT EXISTS 'sent';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE borrow_status ADD VALUE IF NOT EXISTS 'closed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add unit_price to borrow items
ALTER TABLE public.inventory_borrow_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lot_number TEXT;

-- 4. Return records (one return can have multiple items)
CREATE TABLE IF NOT EXISTS public.supplier_order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_id UUID REFERENCES public.inventory_borrows(id) NOT NULL,
  status return_status NOT NULL DEFAULT 'pending',
  return_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER supplier_order_returns_updated_at
  BEFORE UPDATE ON public.supplier_order_returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Return line items (flexible: different product, qty, price from original)
CREATE TABLE IF NOT EXISTS public.supplier_order_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES public.supplier_order_returns(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  lot_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_borrows_case_id ON public.inventory_borrows(case_id);
CREATE INDEX IF NOT EXISTS idx_borrows_order_type ON public.inventory_borrows(order_type);
CREATE INDEX IF NOT EXISTS idx_borrows_converted_to ON public.inventory_borrows(converted_to_id);
CREATE INDEX IF NOT EXISTS idx_returns_borrow_id ON public.supplier_order_returns(borrow_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON public.supplier_order_return_items(return_id);

-- 7. RLS for new tables
ALTER TABLE public.supplier_order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_order_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read returns" ON public.supplier_order_returns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Stock/Admin can insert returns" ON public.supplier_order_returns
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'stock_staff'));
CREATE POLICY "Stock/Admin can update returns" ON public.supplier_order_returns
  FOR UPDATE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'stock_staff'));

CREATE POLICY "Authenticated can read return items" ON public.supplier_order_return_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Stock/Admin can insert return items" ON public.supplier_order_return_items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'stock_staff'));
CREATE POLICY "Stock/Admin can update return items" ON public.supplier_order_return_items
  FOR UPDATE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'stock_staff'));

-- 8. Audit triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_log_trigger') THEN
    CREATE TRIGGER audit_supplier_order_returns
      AFTER INSERT OR UPDATE OR DELETE ON public.supplier_order_returns
      FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
  END IF;
END;
$$;
