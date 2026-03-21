-- 011: Add product attributes for advanced filtering
-- Adds model, diameter, length to products table
-- Creates brands and product_models lookup tables

-- 1. Add columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS diameter NUMERIC(5,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS length NUMERIC(5,2);

-- 2. Brands lookup table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read brands" ON public.brands
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage brands" ON public.brands
  FOR ALL USING (public.is_admin());

-- 3. Product models lookup table
CREATE TABLE IF NOT EXISTS public.product_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- RLS for product_models
ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product_models" ON public.product_models
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage product_models" ON public.product_models
  FOR ALL USING (public.is_admin());

-- 4. Index for filtering
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(model);
CREATE INDEX IF NOT EXISTS idx_products_diameter ON public.products(diameter);
CREATE INDEX IF NOT EXISTS idx_products_length ON public.products(length);
