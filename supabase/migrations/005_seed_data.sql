-- ============================================================
-- 005: Comprehensive Seed Data
-- Uses existing @dentalstock.test users (created via Supabase Dashboard)
--
-- User IDs:
--   admin     = c47dd37e-7ddc-4f00-a4dd-b370273ce87b
--   dentist   = 57d8a316-abe0-4eea-84f3-82da4cb97647
--   assistant = 0ced7202-97d5-4cfd-b3a0-27bdd05e99fa
--   stock     = 6258d012-10a3-4fe4-829c-281390da8a9e
--   cs        = b10d828c-f9b6-43b5-afda-b8ab28059843
--
-- Business logic enforced:
--   ready     -> ALL reservations must be "prepared" (lot assigned)
--   completed -> ALL reservations must be "consumed" (qty_used set)
--   cancelled -> reservations are "returned"
--   inventory reserved_quantity matches active reservations
--   inventory quantity reflects consumed items
-- ============================================================

SET session_replication_role = replica;

-- ===== App settings =====
INSERT INTO public.app_settings (discord_webhook_url, emergency_alert_enabled)
VALUES (NULL, true)
ON CONFLICT DO NOTHING;

-- ===== Public users (profile for existing auth.users) =====
-- NOTE: auth.users already exist in Supabase — we only create public.users rows
INSERT INTO public.users (id, email, full_name, role, phone) VALUES
  ('c47dd37e-7ddc-4f00-a4dd-b370273ce87b', 'admin@dentalstock.test',     'Admin',              'admin',       '081-111-1111'),
  ('57d8a316-abe0-4eea-84f3-82da4cb97647', 'dentist@dentalstock.test',   'ทันตแพทย์',           'dentist',     '081-222-2222'),
  ('0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', 'assistant@dentalstock.test', 'ผู้ช่วยทันตแพทย์',     'assistant',   '081-333-3333'),
  ('6258d012-10a3-4fe4-829c-281390da8a9e', 'stock@dentalstock.test',     'เจ้าหน้าที่สต็อก',     'stock_staff', '081-444-4444'),
  ('b10d828c-f9b6-43b5-afda-b8ab28059843', 'cs@dentalstock.test',        'เจ้าหน้าที่ CS',      'cs',          '081-555-5555')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;

-- ===== Suppliers =====
INSERT INTO public.suppliers (code, name, contact_person, phone, email, lead_time_days) VALUES
  ('SUP-001', 'Straumann Thailand',     'คุณสมชาย', '02-123-4567', 'sales@straumann.co.th',    7),
  ('SUP-002', 'Nobel Biocare Thailand',  'คุณวิภา',  '02-234-5678', 'sales@nobelbiocare.co.th', 10),
  ('SUP-003', 'Osstem Thailand',         'คุณณัฐ',   '02-345-6789', 'sales@osstem.co.th',        5),
  ('SUP-004', 'MegaGen Implant',         'คุณพิมพ์',  '02-456-7890', 'sales@megagen.co.th',       7),
  ('SUP-005', 'DIO Implant Thailand',    'คุณธนา',   '02-567-8901', 'sales@dioimplant.co.th',    5);

-- ===== Products =====
-- Implants
INSERT INTO public.products (ref, name, brand, category, unit, min_stock_level, cost_price, selling_price, supplier_id) VALUES
  ('IMP-STR-001', 'BLX Implant 4.0x10mm',      'Straumann',    'implant', 'ชิ้น', 5,  8500.00,  25000.00, (SELECT id FROM public.suppliers WHERE code='SUP-001')),
  ('IMP-STR-002', 'BLX Implant 4.0x12mm',      'Straumann',    'implant', 'ชิ้น', 5,  8500.00,  25000.00, (SELECT id FROM public.suppliers WHERE code='SUP-001')),
  ('IMP-STR-003', 'BLT Implant 4.1x10mm',      'Straumann',    'implant', 'ชิ้น', 3,  7800.00,  22000.00, (SELECT id FROM public.suppliers WHERE code='SUP-001')),
  ('IMP-NOB-001', 'NobelActive 4.3x11.5mm',    'Nobel Biocare','implant', 'ชิ้น', 3,  9200.00,  28000.00, (SELECT id FROM public.suppliers WHERE code='SUP-002')),
  ('IMP-NOB-002', 'NobelParallel CC 4.3x13mm', 'Nobel Biocare','implant', 'ชิ้น', 3,  9500.00,  29000.00, (SELECT id FROM public.suppliers WHERE code='SUP-002')),
  ('IMP-OSS-001', 'TS III SA 4.0x10mm',        'Osstem',       'implant', 'ชิ้น', 5,  4500.00,  15000.00, (SELECT id FROM public.suppliers WHERE code='SUP-003')),
  ('IMP-OSS-002', 'TS III SA 4.0x11.5mm',      'Osstem',       'implant', 'ชิ้น', 5,  4500.00,  15000.00, (SELECT id FROM public.suppliers WHERE code='SUP-003'));

-- Abutments
INSERT INTO public.products (ref, name, brand, category, unit, min_stock_level, cost_price, selling_price, supplier_id) VALUES
  ('ABT-STR-001', 'Variobase Abutment',     'Straumann',    'abutment', 'ชิ้น', 3, 4200.00, 12000.00, (SELECT id FROM public.suppliers WHERE code='SUP-001')),
  ('ABT-NOB-001', 'Multi-unit Abutment 30°','Nobel Biocare','abutment', 'ชิ้น', 3, 5500.00, 15000.00, (SELECT id FROM public.suppliers WHERE code='SUP-002')),
  ('ABT-OSS-001', 'Transfer Abutment',      'Osstem',       'abutment', 'ชิ้น', 5, 1800.00,  5000.00, (SELECT id FROM public.suppliers WHERE code='SUP-003'));

-- Consumables
INSERT INTO public.products (ref, name, brand, category, unit, min_stock_level, cost_price, selling_price, supplier_id) VALUES
  ('CON-001', 'Bone Graft 0.5cc',           'Bio-Oss',   'consumable', 'ชิ้น',  10, 3500.00, 8000.00, (SELECT id FROM public.suppliers WHERE code='SUP-001')),
  ('CON-002', 'Collagen Membrane 20x30mm',  'Bio-Gide',  'consumable', 'แผ่น',   5, 4800.00, 9500.00, (SELECT id FROM public.suppliers WHERE code='SUP-001')),
  ('CON-003', 'Healing Cap 4.0mm',          'Straumann', 'consumable', 'ชิ้น',  10,  350.00,  800.00, (SELECT id FROM public.suppliers WHERE code='SUP-001')),
  ('CON-004', 'Cover Screw',                'Osstem',    'consumable', 'ชิ้น',  20,  180.00,  500.00, (SELECT id FROM public.suppliers WHERE code='SUP-003'));

-- Instruments
INSERT INTO public.products (ref, name, brand, category, unit, min_stock_level, cost_price, selling_price, supplier_id) VALUES
  ('INS-001', 'Surgical Kit BLX',   'Straumann', 'instrument', 'ชุด',  1, 45000.00, 65000.00, (SELECT id FROM public.suppliers WHERE code='SUP-001')),
  ('INS-002', 'Torque Wrench 35Ncm','Straumann', 'instrument', 'ชิ้น', 2,  8500.00, 12000.00, (SELECT id FROM public.suppliers WHERE code='SUP-001'));

-- ===== Patients =====
INSERT INTO public.patients (id, hn, full_name, gender, date_of_birth, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'HN-001', 'นายสมศักดิ์ มั่นคง',     'male',   '1975-03-15', 'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('a0000000-0000-0000-0000-000000000002', 'HN-002', 'นางสาวสุดา แก้วใส',      'female', '1982-07-22', 'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('a0000000-0000-0000-0000-000000000003', 'HN-003', 'นายวิชัย เพชรดี',        'male',   '1968-11-03', 'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('a0000000-0000-0000-0000-000000000004', 'HN-004', 'นางมาลี ดอกไม้',         'female', '1990-01-12', 'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('a0000000-0000-0000-0000-000000000005', 'HN-005', 'นายประสิทธิ์ ทองสุข',     'male',   '1955-09-28', 'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('a0000000-0000-0000-0000-000000000006', 'HN-006', 'นางสาวพรทิพย์ สวัสดี',   'female', '1988-04-17', 'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('a0000000-0000-0000-0000-000000000007', 'HN-007', 'นายอภิชาติ ศรีสว่าง',     'male',   '1972-12-01', 'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('a0000000-0000-0000-0000-000000000008', 'HN-008', 'นางจันทร์ เดือนดี',       'female', '1965-06-20', 'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('a0000000-0000-0000-0000-000000000009', 'HN-009', 'นายเกรียงศักดิ์ บุญมา',   'male',   '1980-02-14', 'b10d828c-f9b6-43b5-afda-b8ab28059843');

-- ===== Inventory (stock on hand) =====
INSERT INTO public.inventory (id, product_id, lot_number, quantity, reserved_quantity, expiry_date, received_date) VALUES
  -- Implants
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM products WHERE ref='IMP-STR-001'), 'LOT-STR-2026A', 10,  1, '2027-06-30', '2026-01-10'),
  ('b0000000-0000-0000-0000-000000000002', (SELECT id FROM products WHERE ref='IMP-STR-002'), 'LOT-STR-2026B',  8,  0, '2027-08-31', '2026-01-10'),
  ('b0000000-0000-0000-0000-000000000003', (SELECT id FROM products WHERE ref='IMP-STR-003'), 'LOT-STR-2026C',  5,  1, '2027-03-31', '2026-01-15'),
  ('b0000000-0000-0000-0000-000000000004', (SELECT id FROM products WHERE ref='IMP-NOB-001'), 'LOT-NOB-2026A',  6,  1, '2027-12-31', '2026-02-01'),
  ('b0000000-0000-0000-0000-000000000005', (SELECT id FROM products WHERE ref='IMP-NOB-002'), 'LOT-NOB-2026B',  4,  0, '2027-10-15', '2026-02-01'),
  ('b0000000-0000-0000-0000-000000000006', (SELECT id FROM products WHERE ref='IMP-OSS-001'), 'LOT-OSS-2026A', 14,  1, '2027-09-30', '2026-01-20'),
  ('b0000000-0000-0000-0000-000000000007', (SELECT id FROM products WHERE ref='IMP-OSS-002'), 'LOT-OSS-2026B', 12,  0, '2027-11-30', '2026-01-20'),
  -- Abutments
  ('b0000000-0000-0000-0000-000000000008', (SELECT id FROM products WHERE ref='ABT-STR-001'), 'LOT-ABT-2026A',  8,  1, '2028-01-31', '2026-02-05'),
  ('b0000000-0000-0000-0000-000000000009', (SELECT id FROM products WHERE ref='ABT-NOB-001'), 'LOT-ABT-2026B',  5,  0, '2028-03-31', '2026-02-05'),
  ('b0000000-0000-0000-0000-000000000010', (SELECT id FROM products WHERE ref='ABT-OSS-001'), 'LOT-ABT-2026C', 10,  0, '2028-06-30', '2026-02-10'),
  -- Consumables
  ('b0000000-0000-0000-0000-000000000011', (SELECT id FROM products WHERE ref='CON-001'), 'LOT-CON-2026A', 20,  1, '2027-06-30', '2026-01-05'),
  ('b0000000-0000-0000-0000-000000000012', (SELECT id FROM products WHERE ref='CON-002'), 'LOT-CON-2026B', 10,  1, '2027-06-30', '2026-01-05'),
  ('b0000000-0000-0000-0000-000000000013', (SELECT id FROM products WHERE ref='CON-003'), 'LOT-CON-2026C', 30,  2, '2028-12-31', '2026-01-05'),
  ('b0000000-0000-0000-0000-000000000014', (SELECT id FROM products WHERE ref='CON-004'), 'LOT-CON-2026D', 39,  1, '2028-12-31', '2026-01-05'),
  -- Instruments (no expiry)
  ('b0000000-0000-0000-0000-000000000015', (SELECT id FROM products WHERE ref='INS-001'), 'LOT-INS-2026A',  2,  0, NULL, '2026-01-01'),
  ('b0000000-0000-0000-0000-000000000016', (SELECT id FROM products WHERE ref='INS-002'), 'LOT-INS-2026B',  3,  0, NULL, '2026-01-01');

-- =====================================================================
-- CASES — every case_status + appointment_status combination
-- =====================================================================
-- User aliases:
--   dentist   = 57d8a316-abe0-4eea-84f3-82da4cb97647
--   assistant = 0ced7202-97d5-4cfd-b3a0-27bdd05e99fa
--   cs        = b10d828c-f9b6-43b5-afda-b8ab28059843
--   admin     = c47dd37e-7ddc-4f00-a4dd-b370273ce87b
--   stock     = 6258d012-10a3-4fe4-829c-281390da8a9e

-- ----- CASE-001: pending_appointment + pending -----
INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, price_to_patient, created_by)
VALUES ('c0000000-0000-0000-0000-000000000001', 'CASE-2026-0001',
  'a0000000-0000-0000-0000-000000000001',
  '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa',
  CURRENT_DATE + INTERVAL '14 days', '09:00', 'pending_appointment', 'pending',
  'Single Implant', '{36}', 35000.00, '57d8a316-abe0-4eea-84f3-82da4cb97647');

-- ----- CASE-002: pending_order + confirmed -----
INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, price_to_patient, created_by)
VALUES ('c0000000-0000-0000-0000-000000000002', 'CASE-2026-0002',
  'a0000000-0000-0000-0000-000000000002',
  '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa',
  CURRENT_DATE + INTERVAL '10 days', '10:30', 'pending_order', 'confirmed',
  'Implant + Bone Graft', '{46,47}', 75000.00, '57d8a316-abe0-4eea-84f3-82da4cb97647');

-- ----- CASE-003: pending_preparation + confirmed (all reserved, none prepared yet) -----
INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, price_to_patient, created_by)
VALUES ('c0000000-0000-0000-0000-000000000003', 'CASE-2026-0003',
  'a0000000-0000-0000-0000-000000000003',
  '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa',
  CURRENT_DATE + INTERVAL '7 days', '13:00', 'pending_preparation', 'confirmed',
  'Single Implant', '{26}', 38000.00, '57d8a316-abe0-4eea-84f3-82da4cb97647');

INSERT INTO public.case_reservations (case_id, product_id, inventory_id, quantity_reserved, status, lot_specified, reserved_by) VALUES
  ('c0000000-0000-0000-0000-000000000003', (SELECT id FROM products WHERE ref='IMP-STR-001'), 'b0000000-0000-0000-0000-000000000001', 1, 'reserved', false, '57d8a316-abe0-4eea-84f3-82da4cb97647'),
  ('c0000000-0000-0000-0000-000000000003', (SELECT id FROM products WHERE ref='ABT-STR-001'), 'b0000000-0000-0000-0000-000000000008', 1, 'reserved', false, '57d8a316-abe0-4eea-84f3-82da4cb97647'),
  ('c0000000-0000-0000-0000-000000000003', (SELECT id FROM products WHERE ref='CON-003'),     'b0000000-0000-0000-0000-000000000013', 1, 'reserved', false, '57d8a316-abe0-4eea-84f3-82da4cb97647');

-- ----- CASE-004: ready + confirmed (ALL reservations prepared with LOT) -----
INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, price_to_patient, created_by)
VALUES ('c0000000-0000-0000-0000-000000000004', 'CASE-2026-0004',
  'a0000000-0000-0000-0000-000000000004',
  '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa',
  CURRENT_DATE + INTERVAL '5 days', '09:30', 'ready', 'confirmed',
  'Implant + GBR', '{16}', 55000.00, '57d8a316-abe0-4eea-84f3-82da4cb97647');

INSERT INTO public.case_reservations (case_id, product_id, inventory_id, quantity_reserved, status, lot_specified, reserved_by, prepared_by, prepared_at) VALUES
  ('c0000000-0000-0000-0000-000000000004', (SELECT id FROM products WHERE ref='IMP-NOB-001'), 'b0000000-0000-0000-0000-000000000004', 1, 'prepared', true, '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', now() - INTERVAL '2 days'),
  ('c0000000-0000-0000-0000-000000000004', (SELECT id FROM products WHERE ref='CON-001'),     'b0000000-0000-0000-0000-000000000011', 1, 'prepared', true, '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', now() - INTERVAL '2 days'),
  ('c0000000-0000-0000-0000-000000000004', (SELECT id FROM products WHERE ref='CON-002'),     'b0000000-0000-0000-0000-000000000012', 1, 'prepared', true, '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', now() - INTERVAL '2 days');

-- ----- CASE-005: completed + confirmed (ALL reservations consumed) -----
INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, price_to_patient, created_by)
VALUES ('c0000000-0000-0000-0000-000000000005', 'CASE-2026-0005',
  'a0000000-0000-0000-0000-000000000005',
  '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa',
  CURRENT_DATE - INTERVAL '3 days', '14:00', 'completed', 'confirmed',
  'Single Implant', '{36}', 20000.00, '57d8a316-abe0-4eea-84f3-82da4cb97647');

INSERT INTO public.case_reservations (case_id, product_id, inventory_id, quantity_reserved, quantity_used, status, lot_specified, reserved_by, prepared_by, prepared_at) VALUES
  ('c0000000-0000-0000-0000-000000000005', (SELECT id FROM products WHERE ref='IMP-OSS-001'), 'b0000000-0000-0000-0000-000000000006', 1, 1, 'consumed', true, '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', now() - INTERVAL '5 days'),
  ('c0000000-0000-0000-0000-000000000005', (SELECT id FROM products WHERE ref='CON-004'),     'b0000000-0000-0000-0000-000000000014', 1, 1, 'consumed', true, '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', now() - INTERVAL '5 days');

-- ----- CASE-006: cancelled + cancelled (reservations returned) -----
INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, notes, created_by)
VALUES ('c0000000-0000-0000-0000-000000000006', 'CASE-2026-0006',
  'a0000000-0000-0000-0000-000000000006',
  '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa',
  CURRENT_DATE - INTERVAL '1 day', '11:00', 'cancelled', 'cancelled',
  'Single Implant', '{14}', 'คนไข้ยกเลิกนัด', '57d8a316-abe0-4eea-84f3-82da4cb97647');

INSERT INTO public.case_reservations (case_id, product_id, inventory_id, quantity_reserved, status, lot_specified, reserved_by) VALUES
  ('c0000000-0000-0000-0000-000000000006', (SELECT id FROM products WHERE ref='IMP-STR-002'), 'b0000000-0000-0000-0000-000000000002', 1, 'returned', false, '57d8a316-abe0-4eea-84f3-82da4cb97647');

-- ----- CASE-007: pending_preparation + confirmed (partially prepared) -----
INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, price_to_patient, created_by)
VALUES ('c0000000-0000-0000-0000-000000000007', 'CASE-2026-0007',
  'a0000000-0000-0000-0000-000000000007',
  '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa',
  CURRENT_DATE + INTERVAL '4 days', '10:00', 'pending_preparation', 'confirmed',
  'Single Implant', '{24}', 30000.00, '57d8a316-abe0-4eea-84f3-82da4cb97647');

INSERT INTO public.case_reservations (case_id, product_id, inventory_id, quantity_reserved, status, lot_specified, reserved_by, prepared_by, prepared_at) VALUES
  ('c0000000-0000-0000-0000-000000000007', (SELECT id FROM products WHERE ref='IMP-STR-003'), 'b0000000-0000-0000-0000-000000000003', 1, 'prepared', true, '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', now() - INTERVAL '1 day');
INSERT INTO public.case_reservations (case_id, product_id, inventory_id, quantity_reserved, status, lot_specified, reserved_by) VALUES
  ('c0000000-0000-0000-0000-000000000007', (SELECT id FROM products WHERE ref='CON-003'),     'b0000000-0000-0000-0000-000000000013', 1, 'reserved', false, '57d8a316-abe0-4eea-84f3-82da4cb97647');

-- ----- CASE-008: pending_order + postponed -----
INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, notes, price_to_patient, created_by)
VALUES ('c0000000-0000-0000-0000-000000000008', 'CASE-2026-0008',
  'a0000000-0000-0000-0000-000000000008',
  '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa',
  CURRENT_DATE + INTERVAL '21 days', '15:00', 'pending_order', 'postponed',
  'Implant + Crown', '{11}', 'เลื่อนนัดจากวันที่เดิม', 45000.00, '57d8a316-abe0-4eea-84f3-82da4cb97647');

-- ----- CASE-009: ready + confirmed (URGENT) -----
INSERT INTO public.cases (id, case_number, patient_id, dentist_id, assistant_id, scheduled_date, scheduled_time, case_status, appointment_status, procedure_type, tooth_positions, price_to_patient, created_by)
VALUES ('c0000000-0000-0000-0000-000000000009', 'CASE-2026-0009',
  'a0000000-0000-0000-0000-000000000009',
  '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa',
  CURRENT_DATE + INTERVAL '1 day', '08:30', 'ready', 'confirmed',
  'Single Implant', '{46}', 18000.00, '57d8a316-abe0-4eea-84f3-82da4cb97647');

INSERT INTO public.case_reservations (case_id, product_id, inventory_id, quantity_reserved, status, lot_specified, reserved_by, prepared_by, prepared_at) VALUES
  ('c0000000-0000-0000-0000-000000000009', (SELECT id FROM products WHERE ref='IMP-OSS-001'), 'b0000000-0000-0000-0000-000000000006', 1, 'prepared', true, '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', now() - INTERVAL '1 day'),
  ('c0000000-0000-0000-0000-000000000009', (SELECT id FROM products WHERE ref='CON-004'),     'b0000000-0000-0000-0000-000000000014', 1, 'prepared', true, '57d8a316-abe0-4eea-84f3-82da4cb97647', '0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', now() - INTERVAL '1 day');

-- =====================================================================
-- Appointment logs
-- =====================================================================
INSERT INTO public.case_appointment_logs (case_id, action, note, performed_by) VALUES
  ('c0000000-0000-0000-0000-000000000002', 'confirmed', 'คนไข้ยืนยันมาตามนัด',     'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('c0000000-0000-0000-0000-000000000003', 'confirmed', 'คนไข้ยืนยันมาตามนัด',     'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('c0000000-0000-0000-0000-000000000004', 'confirmed', 'คนไข้ยืนยันมาตามนัด',     'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('c0000000-0000-0000-0000-000000000005', 'confirmed', 'คนไข้ยืนยันมาตามนัด',     'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('c0000000-0000-0000-0000-000000000006', 'cancelled', 'คนไข้โทรยกเลิก',          'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('c0000000-0000-0000-0000-000000000007', 'confirmed', 'คนไข้ยืนยันมาตามนัด',     'b10d828c-f9b6-43b5-afda-b8ab28059843'),
  ('c0000000-0000-0000-0000-000000000009', 'confirmed', 'คนไข้ยืนยันนัดฉุกเฉิน',   'b10d828c-f9b6-43b5-afda-b8ab28059843');

INSERT INTO public.case_appointment_logs (case_id, action, note, performed_by, performed_at) VALUES
  ('c0000000-0000-0000-0000-000000000008', 'confirmed', 'คนไข้ยืนยันมาตามนัด', 'b10d828c-f9b6-43b5-afda-b8ab28059843', now() - INTERVAL '5 days');
INSERT INTO public.case_appointment_logs (case_id, action, note, old_date, new_date, performed_by, performed_at) VALUES
  ('c0000000-0000-0000-0000-000000000008', 'postponed', 'คนไข้ขอเลื่อนนัด ติดธุระ',
    CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '21 days',
    'b10d828c-f9b6-43b5-afda-b8ab28059843', now() - INTERVAL '3 days');

-- =====================================================================
-- PURCHASE ORDERS — every po_status
-- =====================================================================

-- PO-001: draft
INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, total_amount, notes, expected_delivery_date, requested_by)
VALUES ('d0000000-0000-0000-0000-000000000001', 'PO2026030001',
  (SELECT id FROM suppliers WHERE code='SUP-001'), 'draft', 17000.00,
  'สั่ง Implant Straumann เพิ่ม', CURRENT_DATE + INTERVAL '14 days',
  '6258d012-10a3-4fe4-829c-281390da8a9e');
INSERT INTO public.purchase_order_items (po_id, product_id, quantity, unit_price) VALUES
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM products WHERE ref='IMP-STR-001'), 2, 8500.00);

-- PO-002: pending_approval
INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, total_amount, expected_delivery_date, requested_by)
VALUES ('d0000000-0000-0000-0000-000000000002', 'PO2026030002',
  (SELECT id FROM suppliers WHERE code='SUP-002'), 'pending_approval', 18400.00,
  CURRENT_DATE + INTERVAL '17 days',
  '6258d012-10a3-4fe4-829c-281390da8a9e');
INSERT INTO public.purchase_order_items (po_id, product_id, quantity, unit_price) VALUES
  ('d0000000-0000-0000-0000-000000000002', (SELECT id FROM products WHERE ref='IMP-NOB-001'), 2, 9200.00);

-- PO-003: approved
INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, total_amount, expected_delivery_date, requested_by, approved_by, approved_at)
VALUES ('d0000000-0000-0000-0000-000000000003', 'PO2026030003',
  (SELECT id FROM suppliers WHERE code='SUP-003'), 'approved', 9000.00,
  CURRENT_DATE + INTERVAL '12 days',
  '6258d012-10a3-4fe4-829c-281390da8a9e', 'c47dd37e-7ddc-4f00-a4dd-b370273ce87b', now() - INTERVAL '1 day');
INSERT INTO public.purchase_order_items (po_id, product_id, quantity, unit_price) VALUES
  ('d0000000-0000-0000-0000-000000000003', (SELECT id FROM products WHERE ref='IMP-OSS-001'), 2, 4500.00);

-- PO-004: ordered
INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, total_amount, expected_delivery_date, requested_by, approved_by, approved_at)
VALUES ('d0000000-0000-0000-0000-000000000004', 'PO2026030004',
  (SELECT id FROM suppliers WHERE code='SUP-004'), 'ordered', 14000.00,
  CURRENT_DATE + INTERVAL '7 days',
  '6258d012-10a3-4fe4-829c-281390da8a9e', 'c47dd37e-7ddc-4f00-a4dd-b370273ce87b', now() - INTERVAL '3 days');
INSERT INTO public.purchase_order_items (po_id, product_id, quantity, unit_price) VALUES
  ('d0000000-0000-0000-0000-000000000004', (SELECT id FROM products WHERE ref='CON-001'), 2, 3500.00),
  ('d0000000-0000-0000-0000-000000000004', (SELECT id FROM products WHERE ref='CON-002'), 1, 4800.00),
  ('d0000000-0000-0000-0000-000000000004', (SELECT id FROM products WHERE ref='CON-003'), 2,  350.00);

-- PO-005: partially_received
INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, total_amount, expected_delivery_date, requested_by, approved_by, approved_at)
VALUES ('d0000000-0000-0000-0000-000000000005', 'PO2026030005',
  (SELECT id FROM suppliers WHERE code='SUP-005'), 'partially_received', 9000.00,
  CURRENT_DATE - INTERVAL '2 days',
  '6258d012-10a3-4fe4-829c-281390da8a9e', 'c47dd37e-7ddc-4f00-a4dd-b370273ce87b', now() - INTERVAL '10 days');
INSERT INTO public.purchase_order_items (po_id, product_id, quantity, unit_price) VALUES
  ('d0000000-0000-0000-0000-000000000005', (SELECT id FROM products WHERE ref='IMP-OSS-001'), 2, 4500.00);

-- PO-006: received
INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, total_amount, expected_delivery_date, requested_by, approved_by, approved_at)
VALUES ('d0000000-0000-0000-0000-000000000006', 'PO2026030006',
  (SELECT id FROM suppliers WHERE code='SUP-001'), 'received', 16500.00,
  CURRENT_DATE - INTERVAL '5 days',
  '6258d012-10a3-4fe4-829c-281390da8a9e', 'c47dd37e-7ddc-4f00-a4dd-b370273ce87b', now() - INTERVAL '14 days');
INSERT INTO public.purchase_order_items (po_id, product_id, quantity, unit_price) VALUES
  ('d0000000-0000-0000-0000-000000000006', (SELECT id FROM products WHERE ref='IMP-STR-001'), 1, 8500.00),
  ('d0000000-0000-0000-0000-000000000006', (SELECT id FROM products WHERE ref='ABT-STR-001'), 1, 4200.00),
  ('d0000000-0000-0000-0000-000000000006', (SELECT id FROM products WHERE ref='CON-003'),     5,  350.00),
  ('d0000000-0000-0000-0000-000000000006', (SELECT id FROM products WHERE ref='CON-004'),     5,  180.00);

-- PO-007: cancelled
INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, total_amount, notes, requested_by)
VALUES ('d0000000-0000-0000-0000-000000000007', 'PO2026030007',
  (SELECT id FROM suppliers WHERE code='SUP-003'), 'cancelled', 9000.00,
  'ยกเลิก — ปรับแผนสั่งซื้อใหม่',
  '6258d012-10a3-4fe4-829c-281390da8a9e');
INSERT INTO public.purchase_order_items (po_id, product_id, quantity, unit_price) VALUES
  ('d0000000-0000-0000-0000-000000000007', (SELECT id FROM products WHERE ref='IMP-OSS-002'), 2, 4500.00);

-- =====================================================================
-- Notifications
-- =====================================================================
INSERT INTO public.notifications (user_id, type, title, message) VALUES
  ('0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', 'case_assigned',       'ได้รับมอบหมายเคส',     'คุณได้รับมอบหมายเป็นผู้ช่วยสำหรับ CASE-2026-0003'),
  ('0ced7202-97d5-4cfd-b3a0-27bdd05e99fa', 'case_assigned',       'ได้รับมอบหมายเคส',     'คุณได้รับมอบหมายเป็นผู้ช่วยสำหรับ CASE-2026-0004'),
  ('6258d012-10a3-4fe4-829c-281390da8a9e', 'low_stock',           'สต็อกต่ำ',              'BLT Implant 4.1x10mm เหลือ 4 ชิ้น (ขั้นต่ำ 5)'),
  ('c47dd37e-7ddc-4f00-a4dd-b370273ce87b', 'po_created',          'ใบสั่งซื้อใหม่',         'PO2026030002 รอการอนุมัติ'),
  ('6258d012-10a3-4fe4-829c-281390da8a9e', 'material_prepared',   'จัดเตรียมวัสดุเสร็จ',    'CASE-2026-0004 วัสดุพร้อมครบทุกรายการ'),
  ('57d8a316-abe0-4eea-84f3-82da4cb97647', 'material_prepared',   'วัสดุพร้อมแล้ว',        'CASE-2026-0009 (ฉุกเฉิน) วัสดุพร้อมแล้ว');

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ===== Summary =====
SELECT 'Seed complete!' AS status,
  (SELECT count(*) FROM public.users) AS users,
  (SELECT count(*) FROM public.patients) AS patients,
  (SELECT count(*) FROM public.cases) AS cases,
  (SELECT count(*) FROM public.case_reservations) AS reservations,
  (SELECT count(*) FROM public.inventory) AS inventory_lots,
  (SELECT count(*) FROM public.purchase_orders) AS purchase_orders;
