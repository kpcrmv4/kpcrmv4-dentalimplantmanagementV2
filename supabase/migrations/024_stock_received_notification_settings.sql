-- 024: Insert stock_received notification settings
-- Runs after 023 has committed the new enum value

INSERT INTO notification_settings
  (event_type, event_label, description, default_in_app, default_line, default_discord, target_roles, is_active, sort_order)
VALUES (
  'stock_received',
  'เมื่อของมาถึง — พร้อมจัดเตรียม',
  'แจ้งเตือนเมื่อวัสดุสำหรับเคสมาถึงแล้ว (รับจากใบยืมหรือใบสั่งซื้อ) และพร้อมให้ stock staff จัดเตรียม',
  true,
  true,
  false,
  '{stock_staff,admin}',
  true,
  6
)
ON CONFLICT (event_type) DO NOTHING;
