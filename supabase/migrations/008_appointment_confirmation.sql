-- 008: Appointment confirmation workflow
-- Adds appointment_status to cases and case_appointment_logs table

-- 1. Create enum
CREATE TYPE appointment_status AS ENUM (
  'pending',       -- รอยืนยัน (CS ยังไม่โทร)
  'confirmed',     -- ยืนยันแล้ว
  'postponed',     -- เลื่อนนัด (ชั่วคราว)
  'cancelled'      -- ยกเลิกนัด
);

-- 2. Add column to cases (default 'pending' for new cases)
ALTER TABLE cases ADD COLUMN appointment_status appointment_status NOT NULL DEFAULT 'pending';

-- 3. Back-fill existing completed/cancelled cases
UPDATE cases SET appointment_status = 'confirmed'
  WHERE case_status IN ('ready', 'completed');
UPDATE cases SET appointment_status = 'cancelled'
  WHERE case_status = 'cancelled';

-- 4. Case appointment logs table
CREATE TABLE case_appointment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  action appointment_status NOT NULL,
  note TEXT,
  old_date DATE,
  new_date DATE,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Index for fast lookup by case
CREATE INDEX idx_case_appointment_logs_case_id ON case_appointment_logs(case_id);

-- 6. Enable RLS
ALTER TABLE case_appointment_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read appointment logs
CREATE POLICY "Authenticated users can view appointment logs"
  ON case_appointment_logs FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert appointment logs
CREATE POLICY "Authenticated users can insert appointment logs"
  ON case_appointment_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
