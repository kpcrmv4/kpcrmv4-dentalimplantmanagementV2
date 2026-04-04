-- Add track_stock_alert flag to products
-- When true, this product will be included in low-stock / out-of-stock alert counts
-- Default false: most products are created but left at 0 stock intentionally

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_stock_alert BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.track_stock_alert
  IS 'เปิด/ปิดการแจ้งเตือนสต๊อกต่ำสำหรับสินค้านี้';
