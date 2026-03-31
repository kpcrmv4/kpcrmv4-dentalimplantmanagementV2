-- Remove pending_appointment from case_status usage
-- Appointment tracking is handled separately via appointment_status field

-- Change default to pending_order
ALTER TABLE public.cases ALTER COLUMN case_status SET DEFAULT 'pending_order';

-- Migrate any existing cases with pending_appointment to pending_order
UPDATE public.cases SET case_status = 'pending_order' WHERE case_status = 'pending_appointment';
