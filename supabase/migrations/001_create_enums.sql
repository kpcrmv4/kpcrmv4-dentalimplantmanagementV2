-- 001: Create all enum types
-- DentalStock Management System

CREATE TYPE user_role AS ENUM ('admin', 'dentist', 'stock_staff', 'assistant', 'cs');

CREATE TYPE case_status AS ENUM (
  'pending_appointment',
  'pending_order',
  'pending_preparation',
  'ready',
  'completed',
  'cancelled'
);

CREATE TYPE reservation_status AS ENUM ('reserved', 'prepared', 'consumed', 'returned');

CREATE TYPE po_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'ordered',
  'partially_received',
  'received',
  'cancelled'
);

CREATE TYPE product_category AS ENUM (
  'implant',
  'abutment',
  'crown',
  'instrument',
  'consumable',
  'other'
);

CREATE TYPE notification_type AS ENUM (
  'case_assigned',
  'po_created',
  'po_approved',
  'out_of_stock',
  'low_stock',
  'expiring_soon',
  'material_prepared',
  'material_lock_request',
  'system'
);
