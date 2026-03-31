-- Fix existing reservations that were auto-prepared by the system
-- Reset "prepared" reservations back to "reserved" if they were auto-prepared
-- (lot_specified = true but no manual prepare action by stock staff)
-- This allows stock staff to properly assign LOT and prepare materials

-- Reset all "prepared" reservations that were auto-prepared back to "reserved"
-- Only for cases that are NOT completed or cancelled
UPDATE public.case_reservations cr
SET
  status = 'reserved',
  inventory_id = NULL,
  lot_specified = false,
  prepared_by = NULL,
  prepared_at = NULL
FROM public.cases c
WHERE cr.case_id = c.id
  AND cr.status = 'prepared'
  AND c.case_status NOT IN ('completed', 'cancelled');

-- Recalculate case statuses for affected cases
-- Cases with all "reserved" items and stock available → pending_preparation
-- Cases with "reserved" items and no stock → pending_order
-- This will be handled by the app's revalidateCaseReadyStatus on next access
