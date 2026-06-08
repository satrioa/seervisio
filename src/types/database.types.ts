/**
 * Database type definitions matching the Supabase schema from migrations 001–012.
 *
 * This is a manually maintained type file for the Supabase client.
 * Run `supabase gen types typescript --linked > src/types/database.types.ts`
 * to regenerate from the live database after all migrations are applied.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: {
          id: number;
          name: string;
          slug: string;
          status: string;
          owner_name: string | null;
          owner_email: string | null;
          owner_phone: string | null;
          logo_url: string | null;
          accent_color: string | null;
          timezone: string;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          name: string;
          slug: string;
          status?: string;
          owner_name?: string | null;
          owner_email?: string | null;
          owner_phone?: string | null;
          logo_url?: string | null;
          accent_color?: string | null;
          timezone?: string;
          currency?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          status?: string;
          owner_name?: string | null;
          owner_email?: string | null;
          owner_phone?: string | null;
          logo_url?: string | null;
          accent_color?: string | null;
          timezone?: string;
          currency?: string;
        };
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          brand_id: number;
          name: string;
          code: string | null;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          name: string;
          code?: string | null;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          code?: string | null;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "branches_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          name: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          last_login_at: string | null;
          preferred_brand_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          name: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          preferred_brand_id?: number | null;
        };
        Update: {
          auth_user_id?: string | null;
          email?: string;
          name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          preferred_brand_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_auth_user_id_fkey";
            columns: ["auth_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_preferred_brand_id_fkey";
            columns: ["preferred_brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
      user_brand_memberships: {
        Row: {
          id: string;
          profile_id: string;
          brand_id: number | null;
          role: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          brand_id?: number | null;
          role: string;
          is_active?: boolean;
        };
        Update: {
          profile_id?: string;
          brand_id?: number | null;
          role?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "user_brand_memberships_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_brand_memberships_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
      user_branch_access: {
        Row: {
          id: string;
          membership_id: string;
          branch_id: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          membership_id: string;
          branch_id: string;
          is_active?: boolean;
        };
        Update: {
          membership_id?: string;
          branch_id?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "user_branch_access_membership_id_fkey";
            columns: ["membership_id"];
            referencedRelation: "user_brand_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_branch_access_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_accounts: {
        Row: {
          id: string;
          brand_id: number;
          branch_id: string | null;
          account_name: string;
          type: string;
          account_number: string | null;
          account_holder_name: string | null;
          bank_name: string | null;
          bank_code: string | null;
          is_cash_account: boolean;
          is_system_account: boolean;
          is_default_receiving_account: boolean;
          is_active: boolean;
          allow_negative_balance: boolean;
          current_balance: number;
          description: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          branch_id?: string | null;
          account_name: string;
          type: string;
          account_number?: string | null;
          account_holder_name?: string | null;
          bank_name?: string | null;
          bank_code?: string | null;
          is_cash_account?: boolean;
          is_system_account?: boolean;
          is_default_receiving_account?: boolean;
          is_active?: boolean;
          allow_negative_balance?: boolean;
          current_balance?: number;
          description?: string | null;
          metadata?: Json;
        };
        Update: {
          account_name?: string;
          type?: string;
          account_number?: string | null;
          account_holder_name?: string | null;
          bank_name?: string | null;
          bank_code?: string | null;
          is_cash_account?: boolean;
          is_system_account?: boolean;
          is_default_receiving_account?: boolean;
          is_active?: boolean;
          allow_negative_balance?: boolean;
          current_balance?: number;
          description?: string | null;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "payment_accounts_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_accounts_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_methods: {
        Row: {
          id: string;
          brand_id: number;
          type: string;
          name: string;
          is_active: boolean;
          default_payment_account_id: string | null;
          mdr_percentage: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          type: string;
          name: string;
          is_active?: boolean;
          default_payment_account_id?: string | null;
          mdr_percentage?: number;
          metadata?: Json;
        };
        Update: {
          type?: string;
          name?: string;
          is_active?: boolean;
          default_payment_account_id?: string | null;
          mdr_percentage?: number;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "payment_methods_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
      inventory_items: {
        Row: {
          id: string;
          brand_id: number;
          category_id: string | null;
          item_type: string;
          name: string;
          sku: string | null;
          barcode: string | null;
          description: string | null;
          unit_name: string;
          cost_price: number;
          selling_price: number;
          min_stock: number;
          track_stock: boolean;
          allow_negative_stock: boolean;
          is_active: boolean;
          metadata: Json;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          category_id?: string | null;
          item_type: string;
          name: string;
          sku?: string | null;
          barcode?: string | null;
          description?: string | null;
          unit_name?: string;
          cost_price?: number;
          selling_price?: number;
          min_stock?: number;
          track_stock?: boolean;
          allow_negative_stock?: boolean;
          is_active?: boolean;
          metadata?: Json;
          deleted_at?: string | null;
        };
        Update: {
          category_id?: string | null;
          item_type?: string;
          name?: string;
          sku?: string | null;
          barcode?: string | null;
          description?: string | null;
          unit_name?: string;
          cost_price?: number;
          selling_price?: number;
          min_stock?: number;
          track_stock?: boolean;
          allow_negative_stock?: boolean;
          is_active?: boolean;
          metadata?: Json;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
      branch_inventory_stocks: {
        Row: {
          id: string;
          brand_id: number;
          branch_id: string;
          item_id: string;
          current_stock: number;
          reserved_stock: number;
          available_stock: number;
          last_movement_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          branch_id: string;
          item_id: string;
          current_stock?: number;
          reserved_stock?: number;
          last_movement_at?: string | null;
        };
        Update: {
          current_stock?: number;
          reserved_stock?: number;
          last_movement_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "branch_inventory_stocks_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branch_inventory_stocks_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branch_inventory_stocks_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          }
        ];
      };
      customers: {
        Row: {
          id: string;
          brand_id: number;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          metadata: Json;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          metadata?: Json;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          metadata?: Json;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
      services: {
        Row: {
          id: string;
          brand_id: number;
          branch_id: string;
          customer_id: string | null;
          service_number: string;
          device_type: string | null;
          device_brand: string | null;
          device_model: string | null;
          device_color: string | null;
          device_imei: string | null;
          device_serial_number: string | null;
          reported_issue: string;
          diagnosis_result: string | null;
          solution_notes: string | null;
          current_status: string;
          previous_status: string | null;
          assigned_technician_id: string | null;
          estimated_cost: number;
          final_cost: number;
          warranty_until: string | null;
          intake_at: string;
          diagnosis_at: string | null;
          waiting_approval_at: string | null;
          repairing_at: string | null;
          qc_at: string | null;
          done_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          metadata: Json;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          branch_id: string;
          customer_id?: string | null;
          service_number: string;
          device_type?: string | null;
          device_brand?: string | null;
          device_model?: string | null;
          device_color?: string | null;
          device_imei?: string | null;
          device_serial_number?: string | null;
          reported_issue: string;
          diagnosis_result?: string | null;
          solution_notes?: string | null;
          current_status?: string;
          estimated_cost?: number;
          final_cost?: number;
          warranty_until?: string | null;
          intake_at?: string;
          created_by?: string | null;
          metadata?: Json;
        };
        Update: {
          customer_id?: string | null;
          diagnosis_result?: string | null;
          solution_notes?: string | null;
          current_status?: string;
          estimated_cost?: number;
          final_cost?: number;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "services_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      service_payments: {
        Row: {
          id: string;
          brand_id: number;
          branch_id: string;
          service_id: string;
          payment_method_id: string;
          payment_account_id: string;
          payment_number: string;
          payment_status: string;
          gross_amount: number;
          mdr_amount: number;
          net_amount: number;
          paid_at: string;
          notes: string | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          branch_id: string;
          service_id: string;
          payment_method_id: string;
          payment_account_id: string;
          payment_number: string;
          payment_status?: string;
          gross_amount: number;
          mdr_amount?: number;
          net_amount: number;
          paid_at?: string;
          notes?: string | null;
          metadata?: Json;
          created_by?: string | null;
        };
        Update: {
          payment_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_payments_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_payments_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_payments_service_id_fkey";
            columns: ["service_id"];
            referencedRelation: "services";
            referencedColumns: ["id"];
          }
        ];
      };
      pos_sales: {
        Row: {
          id: string;
          brand_id: number;
          branch_id: string;
          customer_id: string | null;
          sale_number: string;
          sale_status: string;
          payment_method_id: string;
          payment_account_id: string;
          gross_amount: number;
          discount_amount: number;
          mdr_amount: number;
          net_amount: number;
          sold_at: string;
          notes: string | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          branch_id: string;
          customer_id?: string | null;
          sale_number: string;
          sale_status?: string;
          payment_method_id: string;
          payment_account_id: string;
          gross_amount: number;
          discount_amount?: number;
          mdr_amount?: number;
          net_amount: number;
          sold_at?: string;
          notes?: string | null;
          metadata?: Json;
          created_by?: string | null;
        };
        Update: {
          sale_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_sales_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_sales_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          }
        ];
      };
      finance_ledger: {
        Row: {
          id: string;
          brand_id: number;
          branch_id: string | null;
          ledger_date: string;
          occurred_at: string;
          entry_type: string;
          direction: string;
          amount: number;
          category: string | null;
          account_code: string | null;
          reference_type: string | null;
          reference_id: string | null;
          source_table: string | null;
          source_id: string | null;
          description: string | null;
          idempotency_key: string | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          branch_id?: string | null;
          ledger_date?: string;
          occurred_at?: string;
          entry_type: string;
          direction: string;
          amount: number;
          category?: string | null;
          account_code?: string | null;
          reference_type?: string | null;
          reference_id?: string | null;
          source_table?: string | null;
          source_id?: string | null;
          description?: string | null;
          idempotency_key?: string | null;
          metadata?: Json;
          created_by?: string | null;
        };
        Update: {};
        Relationships: [
          {
            foreignKeyName: "finance_ledger_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_ledger_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          }
        ];
      };
      store_shifts: {
        Row: {
          id: string;
          brand_id: number;
          branch_id: string;
          cash_account_id: string;
          shift_number: string;
          shift_status: string;
          opening_cash: number;
          previous_closing_cash: number | null;
          opening_difference: number;
          expected_closing_cash: number | null;
          counted_closing_cash: number | null;
          cash_difference: number | null;
          opened_at: string;
          closed_at: string | null;
          opened_by: string | null;
          closed_by: string | null;
          opening_notes: string | null;
          closing_notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          branch_id: string;
          cash_account_id: string;
          shift_number: string;
          shift_status?: string;
          opening_cash: number;
          opened_by?: string | null;
          opening_notes?: string | null;
          metadata?: Json;
        };
        Update: {
          shift_status?: string;
          expected_closing_cash?: number | null;
          counted_closing_cash?: number | null;
          cash_difference?: number | null;
          closed_at?: string | null;
          closed_by?: string | null;
          closing_notes?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_shifts_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_shifts_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          brand_id: number;
          branch_id: string | null;
          actor_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand_id: number;
          branch_id?: string | null;
          actor_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json | null;
        };
        Update: {};
        Relationships: [
          {
            foreignKeyName: "audit_logs_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      daily_finance_summary: {
        Row: {
          brand_id: number;
          branch_id: string | null;
          ledger_date: string;
          service_revenue: number;
          pos_revenue: number;
          other_income: number;
          mdr_expense: number;
          operating_expense: number;
          cogs: number;
          cash_adjustment: number;
          payment_refund: number;
          net_profit: number;
        };
        Relationships: [];
      };
      monthly_finance_summary: {
        Row: {
          brand_id: number;
          branch_id: string | null;
          year: number;
          month: number;
          service_revenue: number;
          pos_revenue: number;
          other_income: number;
          mdr_expense: number;
          operating_expense: number;
          cogs: number;
          cash_adjustment: number;
          payment_refund: number;
          net_profit: number;
        };
        Relationships: [];
      };
      payment_method_summary: {
        Row: {
          brand_id: number;
          branch_id: string;
          payment_method_id: string;
          payment_method_type: string;
          payment_method_name: string;
          transaction_count: number;
          total_gross_amount: number;
          total_mdr_amount: number;
          total_net_amount: number;
        };
        Relationships: [];
      };
      branch_revenue_summary: {
        Row: {
          brand_id: number;
          branch_id: string | null;
          service_revenue: number;
          pos_revenue: number;
          other_income: number;
          total_revenue: number;
          mdr_expense: number;
          cogs: number;
          operating_expense: number;
          cash_adjustment: number;
          net_profit: number;
        };
        Relationships: [];
      };
      store_shift_summary: {
        Row: {
          shift_id: string;
          brand_id: number;
          branch_id: string;
          shift_number: string;
          shift_status: string;
          opened_at: string;
          closed_at: string | null;
          opening_cash: number;
          expected_closing_cash: number | null;
          counted_closing_cash: number | null;
          cash_difference: number | null;
          duration_minutes: number | null;
          opened_by: string | null;
          closed_by: string | null;
          opened_by_name: string | null;
          closed_by_name: string | null;
        };
        Relationships: [];
      };
      service_status_summary: {
        Row: {
          brand_id: number;
          branch_id: string;
          current_status: string;
          service_count: number;
        };
        Relationships: [];
      };
      inventory_stock_summary: {
        Row: {
          item_id: string;
          brand_id: number;
          branch_id: string | null;
          item_name: string;
          sku: string | null;
          item_type: string;
          current_stock: number;
          reserved_stock: number;
          available_stock: number;
          min_stock: number;
          stock_status: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_user_profile_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_user_brand_ids: {
        Args: Record<string, never>;
        Returns: number[];
      };
      get_user_branch_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      get_user_roles: {
        Args: Record<string, never>;
        Returns: string[];
      };
      generate_service_number: {
        Args: { p_brand_id: number };
        Returns: string;
      };
      add_inventory_movement: {
        Args: {
          p_brand_id: number;
          p_branch_id: string;
          p_item_id: string;
          p_direction: string;
          p_movement_type: string;
          p_quantity: number;
          p_unit_cost?: number;
          p_reference_type?: string;
          p_reference_id?: string;
          p_idempotency_key?: string;
          p_description?: string;
          p_metadata?: Json;
          p_created_by?: string;
        };
        Returns: string;
      };
      record_service_payment: {
        Args: {
          p_service_id: string;
          p_payment_method_id: string;
          p_amount: number;
          p_paid_at?: string;
          p_notes?: string;
          p_metadata?: Json;
          p_created_by?: string;
          p_idempotency_key?: string;
        };
        Returns: Json;
      };
      record_pos_sale: {
        Args: {
          p_brand_id: number;
          p_branch_id: string;
          p_customer_id?: string;
          p_payment_method_id: string;
          p_items: Json;
          p_discount_amount?: number;
          p_sold_at?: string;
          p_notes?: string;
          p_metadata?: Json;
          p_created_by?: string;
          p_idempotency_key?: string;
        };
        Returns: Json;
      };
      open_store_shift: {
        Args: {
          p_brand_id: number;
          p_branch_id: string;
          p_opening_cash: number;
          p_opening_notes?: string;
          p_opened_by?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      close_store_shift: {
        Args: {
          p_shift_id: string;
          p_counted_closing_cash: number;
          p_closing_notes?: string;
          p_closed_by?: string;
          p_metadata?: Json;
        };
        Returns: Json;
      };
    };
  };
}
