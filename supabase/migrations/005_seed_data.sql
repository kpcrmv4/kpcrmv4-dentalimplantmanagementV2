-- 005: Seed data
-- Sample suppliers and products for initial setup

-- App settings (singleton row)
INSERT INTO public.app_settings (discord_webhook_url, emergency_alert_enabled)
VALUES (NULL, true);

-- Suppliers
INSERT INTO public.suppliers (code, name, contact_person, phone, email, lead_time_days) VALUES
  ('SUP-001', 'Straumann Thailand', 'คุณสมชาย', '02-123-4567', 'sales@straumann.co.th', 7),
  ('SUP-002', 'Nobel Biocare Thailand', 'คุณวิภา', '02-234-5678', 'sales@nobelbiocare.co.th', 10),
  ('SUP-003', 'Osstem Thailand', 'คุณณัฐ', '02-345-6789', 'sales@osstem.co.th', 5),
  ('SUP-004', 'MegaGen Implant', 'คุณพิมพ์', '02-456-7890', 'sales@megagen.co.th', 7),
  ('SUP-005', 'DIO Implant Thailand', 'คุณธนา', '02-567-8901', 'sales@dioimplant.co.th', 5);

-- Products: Implants
INSERT INTO public.products (ref, name, brand, category, unit, min_stock_level, cost_price, supplier_id) VALUES
  ('IMP-STR-001', 'BLX Implant 4.0x10mm', 'Straumann', 'implant', 'ชิ้น', 5, 8500.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-001')),
  ('IMP-STR-002', 'BLX Implant 4.0x12mm', 'Straumann', 'implant', 'ชิ้น', 5, 8500.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-001')),
  ('IMP-STR-003', 'BLT Implant 4.1x10mm', 'Straumann', 'implant', 'ชิ้น', 3, 7800.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-001')),
  ('IMP-NOB-001', 'NobelActive 4.3x11.5mm', 'Nobel Biocare', 'implant', 'ชิ้น', 3, 9200.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-002')),
  ('IMP-NOB-002', 'NobelParallel CC 4.3x13mm', 'Nobel Biocare', 'implant', 'ชิ้น', 3, 9500.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-002')),
  ('IMP-OSS-001', 'TS III SA 4.0x10mm', 'Osstem', 'implant', 'ชิ้น', 5, 4500.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-003')),
  ('IMP-OSS-002', 'TS III SA 4.0x11.5mm', 'Osstem', 'implant', 'ชิ้น', 5, 4500.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-003'));

-- Products: Abutments
INSERT INTO public.products (ref, name, brand, category, unit, min_stock_level, cost_price, supplier_id) VALUES
  ('ABT-STR-001', 'Variobase Abutment', 'Straumann', 'abutment', 'ชิ้น', 3, 4200.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-001')),
  ('ABT-NOB-001', 'Multi-unit Abutment 30°', 'Nobel Biocare', 'abutment', 'ชิ้น', 3, 5500.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-002')),
  ('ABT-OSS-001', 'Transfer Abutment', 'Osstem', 'abutment', 'ชิ้น', 5, 1800.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-003'));

-- Products: Consumables
INSERT INTO public.products (ref, name, brand, category, unit, min_stock_level, cost_price, supplier_id) VALUES
  ('CON-001', 'Bone Graft 0.5cc', 'Bio-Oss', 'consumable', 'ชิ้น', 10, 3500.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-001')),
  ('CON-002', 'Collagen Membrane 20x30mm', 'Bio-Gide', 'consumable', 'แผ่น', 5, 4800.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-001')),
  ('CON-003', 'Healing Cap 4.0mm', 'Straumann', 'consumable', 'ชิ้น', 10, 350.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-001')),
  ('CON-004', 'Cover Screw', 'Osstem', 'consumable', 'ชิ้น', 20, 180.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-003'));

-- Products: Instruments
INSERT INTO public.products (ref, name, brand, category, unit, min_stock_level, cost_price, supplier_id) VALUES
  ('INS-001', 'Surgical Kit BLX', 'Straumann', 'instrument', 'ชุด', 1, 45000.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-001')),
  ('INS-002', 'Torque Wrench 35Ncm', 'Straumann', 'instrument', 'ชิ้น', 2, 8500.00, (SELECT id FROM public.suppliers WHERE code = 'SUP-001'));
