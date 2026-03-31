-- Allow assistant role to insert case_reservations
-- Assistants receive instructions from dentists and need to add/change materials in cases

DROP POLICY IF EXISTS "reservations_insert" ON public.case_reservations;

CREATE POLICY "reservations_insert" ON public.case_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'dentist', 'assistant')
  );
