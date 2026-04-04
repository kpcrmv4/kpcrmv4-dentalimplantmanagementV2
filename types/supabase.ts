export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          discord_webhook_url: string | null
          emergency_alert_enabled: boolean | null
          id: string
          updated_at: string | null
        }
        Insert: {
          discord_webhook_url?: string | null
          emergency_alert_enabled?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          discord_webhook_url?: string | null
          emergency_alert_enabled?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      case_reservations: {
        Row: {
          case_id: string
          id: string
          inventory_id: string | null
          lot_specified: boolean
          photo_uploaded_at: string | null
          photo_url: string | null
          prepared_at: string | null
          prepared_by: string | null
          product_id: string
          quantity_reserved: number
          quantity_used: number | null
          reserved_at: string
          reserved_by: string | null
          status: Database["public"]["Enums"]["reservation_status"]
        }
        Insert: {
          case_id: string
          id?: string
          inventory_id?: string | null
          lot_specified?: boolean
          photo_uploaded_at?: string | null
          photo_url?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          product_id: string
          quantity_reserved: number
          quantity_used?: number | null
          reserved_at?: string
          reserved_by?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Update: {
          case_id?: string
          id?: string
          inventory_id?: string | null
          lot_specified?: boolean
          photo_uploaded_at?: string | null
          photo_url?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          product_id?: string
          quantity_reserved?: number
          quantity_used?: number | null
          reserved_at?: string
          reserved_by?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "case_reservations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_reservations_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_reservations_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_reservations_reserved_by_fkey"
            columns: ["reserved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      case_appointment_logs: {
        Row: {
          id: string
          case_id: string
          action: Database["public"]["Enums"]["appointment_status"]
          note: string | null
          old_date: string | null
          new_date: string | null
          performed_by: string | null
          performed_at: string
        }
        Insert: {
          id?: string
          case_id: string
          action: Database["public"]["Enums"]["appointment_status"]
          note?: string | null
          old_date?: string | null
          new_date?: string | null
          performed_by?: string | null
          performed_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          action?: Database["public"]["Enums"]["appointment_status"]
          note?: string | null
          old_date?: string | null
          new_date?: string | null
          performed_by?: string | null
          performed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_appointment_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_appointment_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          appointment_status: Database["public"]["Enums"]["appointment_status"]
          assistant_id: string | null
          case_number: string
          case_status: Database["public"]["Enums"]["case_status"]
          created_at: string
          created_by: string | null
          dentist_id: string
          id: string
          notes: string | null
          patient_id: string
          procedure_type: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          tooth_positions: number[] | null
          updated_at: string
        }
        Insert: {
          appointment_status?: Database["public"]["Enums"]["appointment_status"]
          assistant_id?: string | null
          case_number: string
          case_status?: Database["public"]["Enums"]["case_status"]
          created_at?: string
          created_by?: string | null
          dentist_id: string
          id?: string
          notes?: string | null
          patient_id: string
          procedure_type?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          tooth_positions?: number[] | null
          updated_at?: string
        }
        Update: {
          appointment_status?: Database["public"]["Enums"]["appointment_status"]
          assistant_id?: string | null
          case_number?: string
          case_status?: Database["public"]["Enums"]["case_status"]
          created_at?: string
          created_by?: string | null
          dentist_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          procedure_type?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          tooth_positions?: number[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          available_quantity: number | null
          created_at: string
          expiry_date: string | null
          id: string
          invoice_number: string | null
          lot_number: string
          po_id: string | null
          product_id: string
          quantity: number
          received_date: string
          reserved_quantity: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          invoice_number?: string | null
          lot_number: string
          po_id?: string | null
          product_id: string
          quantity?: number
          received_date?: string
          reserved_quantity?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          invoice_number?: string | null
          lot_number?: string
          po_id?: string | null
          product_id?: string
          quantity?: number
          received_date?: string
          reserved_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          sent_via: string[] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          sent_via?: string[] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          sent_via?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          full_name: string
          gender: string | null
          hn: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          hn: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          hn?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: Database["public"]["Enums"]["product_category"]
          cost_price: number | null
          created_at: string
          description: string | null
          diameter: number | null
          id: string
          image_url: string | null
          is_active: boolean
          length: number | null
          min_stock_level: number
          model: string | null
          name: string
          ref: string
          selling_price: number | null
          supplier_id: string | null
          track_stock_alert: boolean
          unit: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category: Database["public"]["Enums"]["product_category"]
          cost_price?: number | null
          created_at?: string
          description?: string | null
          diameter?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          length?: number | null
          min_stock_level?: number
          model?: string | null
          name: string
          ref: string
          selling_price?: number | null
          supplier_id?: string | null
          track_stock_alert?: boolean
          unit: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number | null
          created_at?: string
          description?: string | null
          diameter?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          length?: number | null
          min_stock_level?: number
          model?: string | null
          name?: string
          ref?: string
          selling_price?: number | null
          supplier_id?: string | null
          track_stock_alert?: boolean
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          po_id: string
          product_id: string
          quantity: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          id?: string
          po_id: string
          product_id: string
          quantity: number
          total_price?: number | null
          unit_price: number
        }
        Update: {
          id?: string
          po_id?: string
          product_id?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          expected_delivery_date: string | null
          id: string
          notes: string | null
          po_number: string
          requested_by: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          po_number: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          delivery_score: number | null
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          line_id: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          delivery_score?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          line_id?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          delivery_score?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          line_id?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          line_user_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          line_user_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          line_user_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_product_availability: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: {
          is_available: boolean
          total_available: number
        }[]
      }
      create_reservations_batch: {
        Args: { p_case_id: string; p_items: Json; p_user_id: string }
        Returns: undefined
      }
      get_cost_per_case: { Args: { p_case_id: string }; Returns: number }
      get_usage_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          case_id: string
          case_number: string
          patient_hn: string
          patient_name: string
          product_category: string
          product_name: string
          product_ref: string
          quantity_used: number
          total_cost: number
          unit_cost: number
          usage_date: string
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "postponed"
        | "cancelled"
      case_status:
        | "pending_appointment"
        | "pending_order"
        | "pending_preparation"
        | "ready"
        | "completed"
        | "cancelled"
      notification_type:
        | "case_assigned"
        | "po_created"
        | "po_approved"
        | "out_of_stock"
        | "low_stock"
        | "expiring_soon"
        | "material_prepared"
        | "system"
        | "material_lock_request"
        | "emergency_case"
      po_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "ordered"
        | "partially_received"
        | "received"
        | "cancelled"
      product_category:
        | "implant"
        | "abutment"
        | "crown"
        | "instrument"
        | "consumable"
        | "other"
      reservation_status: "reserved" | "prepared" | "consumed" | "returned"
      user_role: "admin" | "dentist" | "stock_staff" | "assistant" | "cs"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
