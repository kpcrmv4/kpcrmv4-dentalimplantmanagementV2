-- 006: Add selling_price, lot_number constraint, and performance indexes
-- For Revenue vs Cost reporting and data integrity

-- 1. Add selling_price to products (for revenue calculation)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2);

-- 2. Add price_to_patient on cases (total case price charged)
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS price_to_patient NUMERIC(12,2);

-- 3. Enforce lot_number is not empty string
ALTER TABLE public.inventory
  ADD CONSTRAINT lot_number_not_empty CHECK (lot_number <> '');

-- 4. RPC: Dentist performance report (Revenue vs Cost)
CREATE OR REPLACE FUNCTION get_dentist_performance(p_from DATE, p_to DATE)
RETURNS TABLE(
  dentist_id UUID,
  dentist_name TEXT,
  total_cases BIGINT,
  completed_cases BIGINT,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  profit NUMERIC,
  avg_cost_per_case NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.dentist_id,
    u.full_name AS dentist_name,
    COUNT(DISTINCT c.id) AS total_cases,
    COUNT(DISTINCT c.id) FILTER (WHERE c.case_status = 'completed') AS completed_cases,
    COALESCE(SUM(c.price_to_patient), 0) AS total_revenue,
    COALESCE(SUM(sub.case_cost), 0) AS total_cost,
    COALESCE(SUM(c.price_to_patient), 0) - COALESCE(SUM(sub.case_cost), 0) AS profit,
    CASE
      WHEN COUNT(DISTINCT c.id) > 0
      THEN ROUND(COALESCE(SUM(sub.case_cost), 0) / COUNT(DISTINCT c.id), 2)
      ELSE 0
    END AS avg_cost_per_case
  FROM cases c
  JOIN users u ON u.id = c.dentist_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(cr.quantity_used * COALESCE(p.cost_price, 0)), 0) AS case_cost
    FROM case_reservations cr
    JOIN products p ON p.id = cr.product_id
    WHERE cr.case_id = c.id AND cr.status = 'consumed'
  ) sub ON true
  WHERE c.scheduled_date BETWEEN p_from AND p_to
    AND c.case_status != 'cancelled'
  GROUP BY c.dentist_id, u.full_name
  ORDER BY total_revenue DESC;
$$;

-- 5. Index for performance on cases.scheduled_date + dentist_id
CREATE INDEX IF NOT EXISTS idx_cases_scheduled_dentist
  ON public.cases(scheduled_date, dentist_id)
  WHERE case_status != 'cancelled';

-- 6. Index for inventory lot_number searches
CREATE INDEX IF NOT EXISTS idx_inventory_lot_number
  ON public.inventory(lot_number);

-- 7. Index for inventory expiry_date (for expiry filter/sort)
CREATE INDEX IF NOT EXISTS idx_inventory_expiry_date
  ON public.inventory(expiry_date)
  WHERE expiry_date IS NOT NULL;
