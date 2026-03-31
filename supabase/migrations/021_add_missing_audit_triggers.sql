-- 021: Add missing audit triggers for all important tables

-- Drop existing triggers first to avoid conflicts (IF EXISTS)
DROP TRIGGER IF EXISTS audit_users ON public.users;
DROP TRIGGER IF EXISTS audit_notifications ON public.notifications;
DROP TRIGGER IF EXISTS audit_case_appointment_logs ON public.case_appointment_logs;
DROP TRIGGER IF EXISTS audit_notification_settings ON public.notification_settings;
DROP TRIGGER IF EXISTS audit_app_settings ON public.app_settings;
DROP TRIGGER IF EXISTS audit_inventory_borrow_items ON public.inventory_borrow_items;
DROP TRIGGER IF EXISTS audit_supplier_order_returns ON public.supplier_order_returns;
DROP TRIGGER IF EXISTS audit_supplier_order_return_items ON public.supplier_order_return_items;

-- Create triggers
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_notifications
  AFTER INSERT OR UPDATE OR DELETE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_case_appointment_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.case_appointment_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_notification_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_app_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_inventory_borrow_items
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_borrow_items
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- Only create if tables exist (from migration 018)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_order_return_items') THEN
    CREATE TRIGGER audit_supplier_order_return_items
      AFTER INSERT OR UPDATE OR DELETE ON public.supplier_order_return_items
      FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
  END IF;
END;
$$;
