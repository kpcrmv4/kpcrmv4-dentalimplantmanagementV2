-- 022: Add supplier LINE notification settings
-- Controls whether to send direct LINE messages to suppliers for borrow/purchase events

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS supplier_line_borrow_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS supplier_line_purchase_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.app_settings.supplier_line_borrow_enabled IS 'ส่ง LINE แจ้ง Supplier เมื่อสร้างใบยืมวัสดุ';
COMMENT ON COLUMN public.app_settings.supplier_line_purchase_enabled IS 'ส่ง LINE แจ้ง Supplier เมื่ออนุมัติใบสั่งซื้อ';
