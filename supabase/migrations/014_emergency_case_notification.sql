-- Add emergency_case to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'emergency_case';

-- Insert notification setting for emergency case alerts
INSERT INTO notification_settings (event_type, event_label, description, default_in_app, default_line, default_discord, target_roles, is_active, sort_order)
VALUES (
  'emergency_case',
  'เคสด่วนภายใน 48 ชม.',
  'แจ้งเตือนเมื่อมีเคสนัดภายใน 48 ชั่วโมง แต่สถานะวัสดุยังไม่พร้อม (ของขาด/รอของ)',
  true,
  true,
  true,
  '{admin,dentist,assistant,stock_staff,cs}',
  true,
  0
)
ON CONFLICT (event_type) DO NOTHING;
