-- 007: Configurable procedure types & product categories
-- Replace hardcoded dropdown options with database-managed lists

-- 1. Procedure types (for cases)
CREATE TABLE public.procedure_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default procedure types
INSERT INTO public.procedure_types (name, sort_order) VALUES
  ('Implant', 1),
  ('Crown', 2),
  ('Bridge', 3),
  ('Abutment', 4),
  ('Bone Graft', 5),
  ('อื่นๆ', 99);

-- RLS
ALTER TABLE public.procedure_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read procedure_types" ON public.procedure_types
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage procedure_types" ON public.procedure_types
  FOR ALL USING (public.is_admin());

-- 2. Convert product_category from enum to TEXT
-- Step 1: Add new TEXT column
ALTER TABLE public.products ADD COLUMN category_text TEXT;
-- Step 2: Copy data
UPDATE public.products SET category_text = category::TEXT;
-- Step 3: Drop old column and rename
ALTER TABLE public.products DROP COLUMN category;
ALTER TABLE public.products RENAME COLUMN category_text TO category;
ALTER TABLE public.products ALTER COLUMN category SET NOT NULL;

-- 3. Product categories lookup table
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with existing categories
INSERT INTO public.product_categories (slug, name, sort_order) VALUES
  ('implant', 'Implant', 1),
  ('abutment', 'Abutment', 2),
  ('crown', 'Crown', 3),
  ('instrument', 'เครื่องมือ', 4),
  ('consumable', 'วัสดุสิ้นเปลือง', 5),
  ('other', 'อื่นๆ', 99);

-- RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product_categories" ON public.product_categories
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage product_categories" ON public.product_categories
  FOR ALL USING (public.is_admin());

-- Drop the old enum type (no longer used)
DROP TYPE IF EXISTS product_category;
