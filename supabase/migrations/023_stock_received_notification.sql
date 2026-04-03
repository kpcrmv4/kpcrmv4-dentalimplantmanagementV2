-- no transaction
-- 023: Add stock_received notification type
-- Triggered when items arrive (via PO or borrow receive) and a case moves to pending_preparation

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'stock_received';

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
