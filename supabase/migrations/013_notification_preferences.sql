-- 013: Notification preferences and LINE integration
-- Adds notification_settings table for configuring which events trigger notifications
-- Adds LINE API config to app_settings

-- 1. Notification settings (system-level defaults)
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type notification_type NOT NULL UNIQUE,
  event_label TEXT NOT NULL,
  description TEXT,
  default_in_app BOOLEAN NOT NULL DEFAULT true,
  default_line BOOLEAN NOT NULL DEFAULT false,
  default_discord BOOLEAN NOT NULL DEFAULT false,
  target_roles user_role[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Seed default notification settings
INSERT INTO public.notification_settings
  (event_type, event_label, description, default_in_app, default_line, default_discord, target_roles, sort_order)
VALUES
  ('case_assigned', 'เมื่อมีเคสใหม่/มอบหมายเคส',
   'แจ้งเตือนเมื่อมีการสร้างเคสใหม่หรือมอบหมายเคสให้ทันตแพทย์',
   true, true, false, '{dentist,admin}', 1),
  ('low_stock', 'เมื่อสินค้าใกล้หมด',
   'แจ้งเตือนเมื่อสต็อกต่ำกว่า min_stock_level',
   true, true, false, '{admin,stock_staff}', 2),
  ('out_of_stock', 'เมื่อสินค้าหมด',
   'แจ้งเตือนเมื่อสต็อกเหลือ 0',
   true, true, true, '{admin,stock_staff}', 3),
  ('po_created', 'เมื่อสร้างใบสั่งซื้อ',
   'แจ้งเตือนเมื่อมีการสร้าง PO ใหม่',
   true, false, false, '{admin}', 4),
  ('po_approved', 'เมื่ออนุมัติใบสั่งซื้อ',
   'แจ้งเตือนเมื่อ PO ได้รับการอนุมัติ',
   true, false, false, '{admin,stock_staff}', 5),
  ('material_prepared', 'เมื่อจัดของเสร็จ',
   'แจ้งเตือนเมื่อวัสดุสำหรับเคสถูกจัดเตรียมเรียบร้อย',
   true, true, false, '{dentist,cs}', 6),
  ('material_lock_request', 'เมื่อมีการขอใช้วัสดุที่ล็อค',
   'แจ้งเตือนเมื่อมีการร้องขอใช้วัสดุที่ถูกจองอยู่',
   true, false, false, '{admin,stock_staff}', 7),
  ('expiring_soon', 'เมื่อวัสดุใกล้หมดอายุ',
   'แจ้งเตือนเมื่อ LOT ใกล้วันหมดอายุ (90 วัน)',
   true, false, false, '{admin,stock_staff}', 8),
  ('system', 'การแจ้งเตือนระบบทั่วไป',
   'ข้อความจากระบบ',
   true, false, false, '{admin}', 99);

-- 3. Add LINE config to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS line_channel_access_token TEXT,
  ADD COLUMN IF NOT EXISTS line_channel_secret TEXT,
  ADD COLUMN IF NOT EXISTS line_notify_enabled BOOLEAN DEFAULT false;

-- 4. RLS for notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read notification_settings" ON public.notification_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage notification_settings" ON public.notification_settings
  FOR ALL USING (public.is_admin());
