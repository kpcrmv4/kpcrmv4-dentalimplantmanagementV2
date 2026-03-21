-- 010: Update procedure types to match dental implant clinic workflow
-- Also ensures the table exists (from migration 007)

-- Clear existing procedure types and re-seed with clinic-specific values
DELETE FROM public.procedure_types;

INSERT INTO public.procedure_types (name, sort_order) VALUES
  ('ฝังรากเทียม', 1),
  ('ฝังรากเทียม + ปลูกกระดูก', 2),
  ('Second stage surgery', 3),
  ('พิมพ์ปากรากเทียม', 4),
  ('ใส่ฟันรากเทียม', 5),
  ('ปลูกกระดูก', 6),
  ('ผ่าตัดเหงือก', 7);
