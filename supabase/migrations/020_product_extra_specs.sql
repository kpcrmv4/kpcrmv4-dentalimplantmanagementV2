-- 020: Add extra product specifications for bone graft, membrane, healing abutment
-- Bone graft: volume (cc), weight (g)
-- Membrane: dimension (e.g. 20x25mm)
-- Healing abutment: abutment_height (mm), gingival_height (mm)
-- diameter already exists from migration 011

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS volume TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimension TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS abutment_height NUMERIC(5,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gingival_height NUMERIC(5,2);
