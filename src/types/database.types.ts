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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          brand_id: number | null
          created_at: string
          description: string | null
          details: Json | null
          id: string
          ip_address: string | null
          request_id: string | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          brand_id?: number | null
          created_at?: string
          description?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          request_id?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          brand_id?: number | null
          created_at?: string
          description?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          request_id?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_inventory_stocks: {
        Row: {
          available_stock: number | null
          branch_id: string
          brand_id: number
          created_at: string
          current_stock: number
          id: string
          item_id: string
          last_movement_at: string | null
          reserved_stock: number
          updated_at: string
        }
        Insert: {
          available_stock?: number | null
          branch_id: string
          brand_id: number
          created_at?: string
          current_stock?: number
          id?: string
          item_id: string
          last_movement_at?: string | null
          reserved_stock?: number
          updated_at?: string
        }
        Update: {
          available_stock?: number | null
          branch_id?: string
          brand_id?: number
          created_at?: string
          current_stock?: number
          id?: string
          item_id?: string
          last_movement_at?: string | null
          reserved_stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_stocks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_stocks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_stocks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_stocks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_stocks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "branch_inventory_stocks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
        ]
      }
      branch_payment_methods: {
        Row: {
          branch_id: string
          brand_id: number
          created_at: string
          id: string
          is_active: boolean
          mdr_percentage: number | null
          method_type: string
          payment_account_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          brand_id: number
          created_at?: string
          id?: string
          is_active?: boolean
          mdr_percentage?: number | null
          method_type: string
          payment_account_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          brand_id?: number
          created_at?: string
          id?: string
          is_active?: boolean
          mdr_percentage?: number | null
          method_type?: string
          payment_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_payment_methods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_payment_methods_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_payment_methods_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          brand_id: number
          code: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          brand_id: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          brand_id?: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_settings: {
        Row: {
          accent_color: string | null
          address: string | null
          brand_id: number
          business_hours: Json | null
          created_at: string
          email: string | null
          favicon_url: string | null
          id: string
          invoice_footer: string | null
          logo_url: string | null
          metadata: Json | null
          phone: string | null
          receipt_footer: string | null
          store_name: string
          tagline: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          brand_id: number
          business_hours?: Json | null
          created_at?: string
          email?: string | null
          favicon_url?: string | null
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          metadata?: Json | null
          phone?: string | null
          receipt_footer?: string | null
          store_name: string
          tagline?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          brand_id?: number
          business_hours?: Json | null
          created_at?: string
          email?: string | null
          favicon_url?: string | null
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          metadata?: Json | null
          phone?: string | null
          receipt_footer?: string | null
          store_name?: string
          tagline?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          accent_color: string | null
          created_at: string
          currency: string
          id: number
          logo_url: string | null
          name: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          slug: string
          status: string
          theme_accent_color: string
          theme_mode: string
          theme_primary_color: string
          theme_tokens: Json | null
          timezone: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          currency?: string
          id?: never
          logo_url?: string | null
          name: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          slug: string
          status?: string
          theme_accent_color?: string
          theme_mode?: string
          theme_primary_color?: string
          theme_tokens?: Json | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          currency?: string
          id?: never
          logo_url?: string | null
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          slug?: string
          status?: string
          theme_accent_color?: string
          theme_mode?: string
          theme_primary_color?: string
          theme_tokens?: Json | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          brand_id: number
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          metadata: Json
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          brand_id: number
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          brand_id?: number
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tac_catalog: {
        Row: {
          brand: string | null
          created_at: string
          device_type: string | null
          marketing_name: string | null
          model: string | null
          tac: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          device_type?: string | null
          marketing_name?: string | null
          model?: string | null
          tac: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          device_type?: string | null
          marketing_name?: string | null
          model?: string | null
          tac?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_ledger: {
        Row: {
          account_code: string | null
          amount: number
          branch_id: string | null
          brand_id: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          direction: string
          entry_type: string
          id: string
          idempotency_key: string | null
          ledger_date: string
          metadata: Json
          occurred_at: string
          reference_id: string | null
          reference_type: string | null
          source_id: string | null
          source_table: string | null
        }
        Insert: {
          account_code?: string | null
          amount: number
          branch_id?: string | null
          brand_id: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction: string
          entry_type: string
          id?: string
          idempotency_key?: string | null
          ledger_date?: string
          metadata?: Json
          occurred_at?: string
          reference_id?: string | null
          reference_type?: string | null
          source_id?: string | null
          source_table?: string | null
        }
        Update: {
          account_code?: string | null
          amount?: number
          branch_id?: string | null
          brand_id?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          ledger_date?: string
          metadata?: Json
          occurred_at?: string
          reference_id?: string | null
          reference_type?: string | null
          source_id?: string | null
          source_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_products: {
        Row: {
          appears_in_pos: boolean
          branch_id: string
          brand_id: number
          category_id: string | null
          condition_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          product_kind: string
          service_usage_enabled: boolean
          unit: string
          updated_at: string
        }
        Insert: {
          appears_in_pos?: boolean
          branch_id: string
          brand_id: number
          category_id?: string | null
          condition_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          product_kind: string
          service_usage_enabled?: boolean
          unit?: string
          updated_at?: string
        }
        Update: {
          appears_in_pos?: boolean
          branch_id?: string
          brand_id?: number
          category_id?: string | null
          condition_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          product_kind?: string
          service_usage_enabled?: boolean
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_sparepart_usage: {
        Row: {
          attributes_snapshot: Json
          branch_id: string
          brand_id: number
          cost_price_snapshot: number
          created_at: string
          created_by: string | null
          id: string
          item_name_snapshot: string
          movement_id: string | null
          product_id: string
          quantity: number
          selling_price_snapshot: number
          service_id: string
          variant_id: string
          variant_name_snapshot: string | null
        }
        Insert: {
          attributes_snapshot?: Json
          branch_id: string
          brand_id: number
          cost_price_snapshot?: number
          created_at?: string
          created_by?: string | null
          id?: string
          item_name_snapshot: string
          movement_id?: string | null
          product_id: string
          quantity: number
          selling_price_snapshot?: number
          service_id: string
          variant_id: string
          variant_name_snapshot?: string | null
        }
        Update: {
          attributes_snapshot?: Json
          branch_id?: string
          brand_id?: number
          cost_price_snapshot?: number
          created_at?: string
          created_by?: string | null
          id?: string
          item_name_snapshot?: string
          movement_id?: string | null
          product_id?: string
          quantity?: number
          selling_price_snapshot?: number
          service_id?: string
          variant_id?: string
          variant_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_sparepart_usage_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_sparepart_usage_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_sparepart_usage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_sparepart_usage_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_sparepart_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inv_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_sparepart_usage_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_sparepart_usage_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "inv_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock_movements: {
        Row: {
          branch_id: string
          brand_id: number
          created_at: string
          created_by: string | null
          direction: string
          id: string
          movement_type: string
          notes: string | null
          product_id: string | null
          quantity: number
          reference_id: string | null
          reference_label: string | null
          reference_type: string | null
          stock_after: number | null
          stock_before: number | null
          unit_id: string | null
          unit_status_after: string | null
          unit_status_before: string | null
          variant_id: string | null
        }
        Insert: {
          branch_id: string
          brand_id: number
          created_at?: string
          created_by?: string | null
          direction: string
          id?: string
          movement_type: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          reference_id?: string | null
          reference_label?: string | null
          reference_type?: string | null
          stock_after?: number | null
          stock_before?: number | null
          unit_id?: string | null
          unit_status_after?: string | null
          unit_status_before?: string | null
          variant_id?: string | null
        }
        Update: {
          branch_id?: string
          brand_id?: number
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_label?: string | null
          reference_type?: string | null
          stock_after?: number | null
          stock_before?: number | null
          unit_id?: string | null
          unit_status_after?: string | null
          unit_status_before?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_movements_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inv_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_movements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inv_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "inv_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock_purchase_items: {
        Row: {
          attributes_snapshot: Json
          barcode_snapshot: string | null
          branch_id: string
          brand_id: number
          created_at: string
          id: string
          movement_id: string | null
          product_id: string
          product_name_snapshot: string
          purchase_id: string
          quantity: number
          sku_snapshot: string | null
          subtotal_amount: number
          unit_cost: number
          unit_selling_price_snapshot: number
          unit_snapshot: string
          variant_id: string
          variant_name_snapshot: string | null
        }
        Insert: {
          attributes_snapshot?: Json
          barcode_snapshot?: string | null
          branch_id: string
          brand_id: number
          created_at?: string
          id?: string
          movement_id?: string | null
          product_id: string
          product_name_snapshot: string
          purchase_id: string
          quantity: number
          sku_snapshot?: string | null
          subtotal_amount?: number
          unit_cost?: number
          unit_selling_price_snapshot?: number
          unit_snapshot?: string
          variant_id: string
          variant_name_snapshot?: string | null
        }
        Update: {
          attributes_snapshot?: Json
          barcode_snapshot?: string | null
          branch_id?: string
          brand_id?: number
          created_at?: string
          id?: string
          movement_id?: string | null
          product_id?: string
          product_name_snapshot?: string
          purchase_id?: string
          quantity?: number
          sku_snapshot?: string | null
          subtotal_amount?: number
          unit_cost?: number
          unit_selling_price_snapshot?: number
          unit_snapshot?: string
          variant_id?: string
          variant_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_purchase_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_purchase_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_purchase_items_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inv_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_purchase_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "inv_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock_purchase_number_counters: {
        Row: {
          branch_id: string
          brand_id: number
          last_number: number
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          branch_id: string
          brand_id: number
          last_number?: number
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          branch_id?: string
          brand_id?: number
          last_number?: number
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_purchase_number_counters_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_purchase_number_counters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock_purchases: {
        Row: {
          branch_id: string
          brand_id: number
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          payment_account_id: string
          purchase_date: string
          purchase_number: string
          status: string
          subtotal_amount: number
          supplier_name: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          brand_id: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_account_id: string
          purchase_date?: string
          purchase_number: string
          status?: string
          subtotal_amount?: number
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          brand_id?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_account_id?: string
          purchase_date?: string
          purchase_number?: string
          status?: string
          subtotal_amount?: number
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_purchases_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_purchases_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_units: {
        Row: {
          accessories_included: string | null
          barcode: string | null
          battery_health: number | null
          branch_id: string
          brand_id: number
          condition_grade: string | null
          created_at: string
          created_by: string | null
          functional_condition_notes: string | null
          id: string
          image_url: string | null
          imei: string | null
          physical_condition_notes: string | null
          product_id: string
          purchase_cost: number
          selling_price: number
          serial_number: string | null
          source_reference_id: string | null
          source_type: string | null
          status: string
          unit_attributes: Json
          updated_at: string
          variant_id: string | null
          warranty_notes: string | null
          warranty_until: string | null
        }
        Insert: {
          accessories_included?: string | null
          barcode?: string | null
          battery_health?: number | null
          branch_id: string
          brand_id: number
          condition_grade?: string | null
          created_at?: string
          created_by?: string | null
          functional_condition_notes?: string | null
          id?: string
          image_url?: string | null
          imei?: string | null
          physical_condition_notes?: string | null
          product_id: string
          purchase_cost?: number
          selling_price?: number
          serial_number?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string
          unit_attributes?: Json
          updated_at?: string
          variant_id?: string | null
          warranty_notes?: string | null
          warranty_until?: string | null
        }
        Update: {
          accessories_included?: string | null
          barcode?: string | null
          battery_health?: number | null
          branch_id?: string
          brand_id?: number
          condition_grade?: string | null
          created_at?: string
          created_by?: string | null
          functional_condition_notes?: string | null
          id?: string
          image_url?: string | null
          imei?: string | null
          physical_condition_notes?: string | null
          product_id?: string
          purchase_cost?: number
          selling_price?: number
          serial_number?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string
          unit_attributes?: Json
          updated_at?: string
          variant_id?: string | null
          warranty_notes?: string | null
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_units_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_units_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_units_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inv_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_units_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "inv_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_variant_stocks: {
        Row: {
          branch_id: string
          brand_id: number
          current_stock: number
          id: string
          reserved_stock: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          branch_id: string
          brand_id: number
          current_stock?: number
          id?: string
          reserved_stock?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          branch_id?: string
          brand_id?: number
          current_stock?: number
          id?: string
          reserved_stock?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_variant_stocks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_variant_stocks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_variant_stocks_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "inv_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_variants: {
        Row: {
          attributes: Json
          average_cost: number
          barcode: string | null
          branch_id: string
          brand_id: number
          cost_price: number
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          min_stock: number
          name: string
          product_id: string
          selling_price: number
          sku: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          average_cost?: number
          barcode?: string | null
          branch_id: string
          brand_id: number
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name: string
          product_id: string
          selling_price?: number
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          average_cost?: number
          barcode?: string | null
          branch_id?: string
          brand_id?: number
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name?: string
          product_id?: string
          selling_price?: number
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_variants_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_variants_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inv_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          brand_id: number
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          item_type: string
          name: string
          sort_order: number
          stock_type: string | null
          updated_at: string
        }
        Insert: {
          brand_id: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          item_type: string
          name: string
          sort_order?: number
          stock_type?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          name?: string
          sort_order?: number
          stock_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_item_units: {
        Row: {
          battery_health: string | null
          branch_id: string
          brand_id: number
          color: string | null
          condition_grade: string | null
          created_at: string
          created_by: string | null
          device_brand: string | null
          device_model: string | null
          id: string
          imei: string | null
          inventory_item_id: string
          note: string | null
          purchase_price: number | null
          selling_price: number | null
          serial_number: string | null
          source: string
          status: string
          storage: string | null
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          battery_health?: string | null
          branch_id: string
          brand_id: number
          color?: string | null
          condition_grade?: string | null
          created_at?: string
          created_by?: string | null
          device_brand?: string | null
          device_model?: string | null
          id?: string
          imei?: string | null
          inventory_item_id: string
          note?: string | null
          purchase_price?: number | null
          selling_price?: number | null
          serial_number?: string | null
          source?: string
          status?: string
          storage?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          battery_health?: string | null
          branch_id?: string
          brand_id?: number
          color?: string | null
          condition_grade?: string | null
          created_at?: string
          created_by?: string | null
          device_brand?: string | null
          device_model?: string | null
          id?: string
          imei?: string | null
          inventory_item_id?: string
          note?: string | null
          purchase_price?: number | null
          selling_price?: number | null
          serial_number?: string | null
          source?: string
          status?: string
          storage?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_units_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_units_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_units_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_units_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_units_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_units_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_item_units_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          allow_negative_stock: boolean
          appears_in_pos: boolean
          average_cost: number
          barcode: string | null
          branch_id: string | null
          brand_id: number
          category_id: string | null
          cost_price: number
          created_at: string
          current_stock: number
          deleted_at: string | null
          description: string | null
          has_variants: boolean
          id: string
          is_active: boolean
          is_variant_parent: boolean
          item_type: string
          metadata: Json
          min_stock: number
          name: string
          parent_item_id: string | null
          product_id: string | null
          selling_price: number
          service_usage_enabled: boolean
          sku: string | null
          stock_type: string
          track_stock: boolean
          tracking_type: string
          unit_attributes: Json
          unit_condition: string | null
          unit_name: string
          updated_at: string
          variant_attributes: Json
          variant_display_name: string | null
          variant_name: string | null
          variant_option_values: Json
        }
        Insert: {
          allow_negative_stock?: boolean
          appears_in_pos?: boolean
          average_cost?: number
          barcode?: string | null
          branch_id?: string | null
          brand_id: number
          category_id?: string | null
          cost_price?: number
          created_at?: string
          current_stock?: number
          deleted_at?: string | null
          description?: string | null
          has_variants?: boolean
          id?: string
          is_active?: boolean
          is_variant_parent?: boolean
          item_type: string
          metadata?: Json
          min_stock?: number
          name: string
          parent_item_id?: string | null
          product_id?: string | null
          selling_price?: number
          service_usage_enabled?: boolean
          sku?: string | null
          stock_type: string
          track_stock?: boolean
          tracking_type?: string
          unit_attributes?: Json
          unit_condition?: string | null
          unit_name?: string
          updated_at?: string
          variant_attributes?: Json
          variant_display_name?: string | null
          variant_name?: string | null
          variant_option_values?: Json
        }
        Update: {
          allow_negative_stock?: boolean
          appears_in_pos?: boolean
          average_cost?: number
          barcode?: string | null
          branch_id?: string | null
          brand_id?: number
          category_id?: string | null
          cost_price?: number
          created_at?: string
          current_stock?: number
          deleted_at?: string | null
          description?: string | null
          has_variants?: boolean
          id?: string
          is_active?: boolean
          is_variant_parent?: boolean
          item_type?: string
          metadata?: Json
          min_stock?: number
          name?: string
          parent_item_id?: string | null
          product_id?: string | null
          selling_price?: number
          service_usage_enabled?: boolean
          sku?: string | null
          stock_type?: string
          track_stock?: boolean
          tracking_type?: string
          unit_attributes?: Json
          unit_condition?: string | null
          unit_name?: string
          updated_at?: string
          variant_attributes?: Json
          variant_display_name?: string | null
          variant_name?: string | null
          variant_option_values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          after_quantity: number
          before_quantity: number
          branch_id: string
          brand_id: number
          created_at: string
          created_by: string | null
          description: string | null
          direction: string
          id: string
          idempotency_key: string | null
          item_id: string
          metadata: Json
          movement_type: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_label: string | null
          reference_type: string | null
          selling_price_snapshot: number | null
          serialized_unit_id: string | null
          total_cost_snapshot: number | null
          total_price_snapshot: number | null
          unit_cost: number | null
          unit_cost_snapshot: number | null
          unit_snapshot: string | null
        }
        Insert: {
          after_quantity: number
          before_quantity: number
          branch_id: string
          brand_id: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction: string
          id?: string
          idempotency_key?: string | null
          item_id: string
          metadata?: Json
          movement_type: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_label?: string | null
          reference_type?: string | null
          selling_price_snapshot?: number | null
          serialized_unit_id?: string | null
          total_cost_snapshot?: number | null
          total_price_snapshot?: number | null
          unit_cost?: number | null
          unit_cost_snapshot?: number | null
          unit_snapshot?: string | null
        }
        Update: {
          after_quantity?: number
          before_quantity?: number
          branch_id?: string
          brand_id?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string
          id?: string
          idempotency_key?: string | null
          item_id?: string
          metadata?: Json
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_label?: string | null
          reference_type?: string | null
          selling_price_snapshot?: number | null
          serialized_unit_id?: string | null
          total_cost_snapshot?: number | null
          total_price_snapshot?: number | null
          unit_cost?: number | null
          unit_cost_snapshot?: number | null
          unit_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
        ]
      }
      inventory_serialized_units: {
        Row: {
          accessories_included: string | null
          barcode: string | null
          battery_health: number | null
          branch_id: string
          brand_id: number
          condition_grade: string | null
          created_at: string
          created_by: string | null
          functional_condition_notes: string | null
          id: string
          imei: string | null
          inventory_item_id: string
          physical_condition_notes: string | null
          purchase_cost: number | null
          selling_price: number | null
          serial_number: string | null
          source_reference_id: string | null
          source_type: string | null
          status: string
          unit_attributes: Json
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          accessories_included?: string | null
          barcode?: string | null
          battery_health?: number | null
          branch_id: string
          brand_id: number
          condition_grade?: string | null
          created_at?: string
          created_by?: string | null
          functional_condition_notes?: string | null
          id?: string
          imei?: string | null
          inventory_item_id: string
          physical_condition_notes?: string | null
          purchase_cost?: number | null
          selling_price?: number | null
          serial_number?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string
          unit_attributes?: Json
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          accessories_included?: string | null
          barcode?: string | null
          battery_health?: number | null
          branch_id?: string
          brand_id?: number
          condition_grade?: string | null
          created_at?: string
          created_by?: string | null
          functional_condition_notes?: string | null
          id?: string
          imei?: string | null
          inventory_item_id?: string
          physical_condition_notes?: string | null
          purchase_cost?: number | null
          selling_price?: number | null
          serial_number?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string
          unit_attributes?: Json
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_serialized_units_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serialized_units_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serialized_units_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serialized_units_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serialized_units_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serialized_units_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_serialized_units_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
        ]
      }
      payment_account_movements: {
        Row: {
          after_balance: number
          amount: number
          before_balance: number
          branch_id: string | null
          brand_id: number
          created_at: string
          created_by: string | null
          description: string | null
          direction: string
          id: string
          metadata: Json
          movement_type: string
          payment_account_id: string
          reference_id: string | null
          reference_type: string | null
          transfer_group_id: string | null
        }
        Insert: {
          after_balance: number
          amount: number
          before_balance: number
          branch_id?: string | null
          brand_id: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction: string
          id?: string
          metadata?: Json
          movement_type: string
          payment_account_id: string
          reference_id?: string | null
          reference_type?: string | null
          transfer_group_id?: string | null
        }
        Update: {
          after_balance?: number
          amount?: number
          before_balance?: number
          branch_id?: string | null
          brand_id?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string
          id?: string
          metadata?: Json
          movement_type?: string
          payment_account_id?: string
          reference_id?: string | null
          reference_type?: string | null
          transfer_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_account_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_account_movements_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_account_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_account_movements_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_holder_name: string | null
          account_name: string
          account_number: string | null
          allow_negative_balance: boolean
          bank_code: string | null
          bank_name: string | null
          branch_id: string | null
          brand_id: number
          created_at: string
          current_balance: number
          description: string | null
          id: string
          is_active: boolean
          is_cash_account: boolean
          is_default_receiving_account: boolean
          is_system_account: boolean
          metadata: Json
          type: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_name: string
          account_number?: string | null
          allow_negative_balance?: boolean
          bank_code?: string | null
          bank_name?: string | null
          branch_id?: string | null
          brand_id: number
          created_at?: string
          current_balance?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_cash_account?: boolean
          is_default_receiving_account?: boolean
          is_system_account?: boolean
          metadata?: Json
          type: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_name?: string
          account_number?: string | null
          allow_negative_balance?: boolean
          bank_code?: string | null
          bank_name?: string | null
          branch_id?: string | null
          brand_id?: number
          created_at?: string
          current_balance?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_cash_account?: boolean
          is_default_receiving_account?: boolean
          is_system_account?: boolean
          metadata?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_accounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand_id: number
          created_at: string
          default_payment_account_id: string | null
          id: string
          is_active: boolean
          mdr_percentage: number
          metadata: Json | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          brand_id: number
          created_at?: string
          default_payment_account_id?: string | null
          id?: string
          is_active?: boolean
          mdr_percentage?: number
          metadata?: Json | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          brand_id?: number
          created_at?: string
          default_payment_account_id?: string | null
          id?: string
          is_active?: boolean
          mdr_percentage?: number
          metadata?: Json | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_default_payment_account_id_fkey"
            columns: ["default_payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_number_counters: {
        Row: {
          brand_id: number
          counter_date: string
          created_at: string
          last_number: number
          updated_at: string
        }
        Insert: {
          brand_id: number
          counter_date?: string
          created_at?: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          brand_id?: number
          counter_date?: string
          created_at?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_number_counters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sale_items: {
        Row: {
          branch_id: string
          brand_id: number
          created_at: string
          discount_amount: number
          id: string
          inventory_item_id: string
          inventory_item_unit_id: string | null
          inventory_movement_id: string | null
          item_type: string | null
          line_total: number
          metadata: Json
          name_snapshot: string | null
          pos_sale_id: string
          quantity: number
          sku_snapshot: string | null
          unit_cost: number
          unit_price: number
        }
        Insert: {
          branch_id: string
          brand_id: number
          created_at?: string
          discount_amount?: number
          id?: string
          inventory_item_id: string
          inventory_item_unit_id?: string | null
          inventory_movement_id?: string | null
          item_type?: string | null
          line_total: number
          metadata?: Json
          name_snapshot?: string | null
          pos_sale_id: string
          quantity: number
          sku_snapshot?: string | null
          unit_cost?: number
          unit_price: number
        }
        Update: {
          branch_id?: string
          brand_id?: number
          created_at?: string
          discount_amount?: number
          id?: string
          inventory_item_id?: string
          inventory_item_unit_id?: string | null
          inventory_movement_id?: string | null
          item_type?: string | null
          line_total?: number
          metadata?: Json
          name_snapshot?: string | null
          pos_sale_id?: string
          quantity?: number
          sku_snapshot?: string | null
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "pos_sale_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "pos_sale_items_inventory_item_unit_id_fkey"
            columns: ["inventory_item_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_item_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_inventory_movement_id_fkey"
            columns: ["inventory_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_pos_sale_id_fkey"
            columns: ["pos_sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sale_number_counters: {
        Row: {
          brand_id: number
          last_number: number
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          brand_id: number
          last_number?: number
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          brand_id?: number
          last_number?: number
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_number_counters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales: {
        Row: {
          branch_id: string
          brand_id: number
          change_amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number
          gross_amount: number
          id: string
          idempotency_key: string | null
          mdr_amount: number
          metadata: Json
          net_amount: number
          notes: string | null
          paid_amount: number
          payment_account_id: string
          payment_account_movement_id: string | null
          payment_method_id: string
          sale_number: string
          sale_status: string
          sold_at: string
          trade_in_amount: number
        }
        Insert: {
          branch_id: string
          brand_id: number
          change_amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          gross_amount: number
          id?: string
          idempotency_key?: string | null
          mdr_amount?: number
          metadata?: Json
          net_amount: number
          notes?: string | null
          paid_amount?: number
          payment_account_id: string
          payment_account_movement_id?: string | null
          payment_method_id: string
          sale_number: string
          sale_status?: string
          sold_at?: string
          trade_in_amount?: number
        }
        Update: {
          branch_id?: string
          brand_id?: number
          change_amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          gross_amount?: number
          id?: string
          idempotency_key?: string | null
          mdr_amount?: number
          metadata?: Json
          net_amount?: number
          notes?: string | null
          paid_amount?: number
          payment_account_id?: string
          payment_account_movement_id?: string | null
          payment_method_id?: string
          sale_number?: string
          sale_status?: string
          sold_at?: string
          trade_in_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_payment_account_movement_id_fkey"
            columns: ["payment_account_movement_id"]
            isOneToOne: false
            referencedRelation: "payment_account_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transaction_items: {
        Row: {
          attributes_snapshot: Json
          battery_health_snapshot: number | null
          branch_id: string
          brand_id: number
          condition_snapshot: string | null
          cost_price_snapshot: number
          created_at: string
          id: string
          imei_snapshot: string | null
          item_name_snapshot: string
          item_type: string
          movement_id: string | null
          product_id: string
          quantity: number
          selling_price_snapshot: number
          serial_number_snapshot: string | null
          subtotal_amount: number
          transaction_id: string
          unit_id: string | null
          variant_id: string | null
          variant_name_snapshot: string | null
        }
        Insert: {
          attributes_snapshot?: Json
          battery_health_snapshot?: number | null
          branch_id: string
          brand_id: number
          condition_snapshot?: string | null
          cost_price_snapshot?: number
          created_at?: string
          id?: string
          imei_snapshot?: string | null
          item_name_snapshot: string
          item_type: string
          movement_id?: string | null
          product_id: string
          quantity?: number
          selling_price_snapshot?: number
          serial_number_snapshot?: string | null
          subtotal_amount?: number
          transaction_id: string
          unit_id?: string | null
          variant_id?: string | null
          variant_name_snapshot?: string | null
        }
        Update: {
          attributes_snapshot?: Json
          battery_health_snapshot?: number | null
          branch_id?: string
          brand_id?: number
          condition_snapshot?: string | null
          cost_price_snapshot?: number
          created_at?: string
          id?: string
          imei_snapshot?: string | null
          item_name_snapshot?: string
          item_type?: string
          movement_id?: string | null
          product_id?: string
          quantity?: number
          selling_price_snapshot?: number
          serial_number_snapshot?: string | null
          subtotal_amount?: number
          transaction_id?: string
          unit_id?: string | null
          variant_id?: string | null
          variant_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transaction_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inv_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inv_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "inv_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transaction_number_counters: {
        Row: {
          brand_id: number
          last_number: number
          month: number
          prefix: string
          updated_at: string
          year: number
        }
        Insert: {
          brand_id: number
          last_number?: number
          month: number
          prefix: string
          updated_at?: string
          year: number
        }
        Update: {
          brand_id?: number
          last_number?: number
          month?: number
          prefix?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_transaction_number_counters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          branch_id: string
          brand_id: number
          change_amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number
          id: string
          notes: string | null
          paid_amount: number
          payment_account_id: string | null
          payment_method_id: string | null
          service_fee_amount: number
          status: string
          subtotal_amount: number
          total_amount: number
          transaction_number: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          brand_id: number
          change_amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          paid_amount?: number
          payment_account_id?: string | null
          payment_method_id?: string | null
          service_fee_amount?: number
          status?: string
          subtotal_amount?: number
          total_amount?: number
          transaction_number: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          brand_id?: number
          change_amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          paid_amount?: number
          payment_account_id?: string | null
          payment_method_id?: string | null
          service_fee_amount?: number
          status?: string
          subtotal_amount?: number
          total_amount?: number
          transaction_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login_at: string | null
          last_pin_changed_at: string | null
          name: string
          phone: string | null
          pin_enabled: boolean
          pin_hash: string | null
          preferred_brand_id: number | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_pin_changed_at?: string | null
          name: string
          phone?: string | null
          pin_enabled?: boolean
          pin_hash?: string | null
          preferred_brand_id?: number | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_pin_changed_at?: string | null
          name?: string
          phone?: string | null
          pin_enabled?: boolean
          pin_hash?: string | null
          preferred_brand_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_brand_id_fkey"
            columns: ["preferred_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          barcode_snapshot: string | null
          created_at: string
          id: string
          item_id: string
          item_name_snapshot: string
          purchase_id: string
          quantity: number
          serialized_unit_id: string | null
          sku_snapshot: string | null
          subtotal: number
          unit_cost_snapshot: number
          unit_snapshot: string
          variant_display_name_snapshot: string | null
          variant_option_values_snapshot: Json
        }
        Insert: {
          barcode_snapshot?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_name_snapshot: string
          purchase_id: string
          quantity: number
          serialized_unit_id?: string | null
          sku_snapshot?: string | null
          subtotal?: number
          unit_cost_snapshot?: number
          unit_snapshot?: string
          variant_display_name_snapshot?: string | null
          variant_option_values_snapshot?: Json
        }
        Update: {
          barcode_snapshot?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_name_snapshot?: string
          purchase_id?: string
          quantity?: number
          serialized_unit_id?: string | null
          sku_snapshot?: string | null
          subtotal?: number
          unit_cost_snapshot?: number
          unit_snapshot?: string
          variant_display_name_snapshot?: string | null
          variant_option_values_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_serialized_unit_id_fkey"
            columns: ["serialized_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_serialized_units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_number_counters: {
        Row: {
          brand_id: number
          created_at: string
          id: string
          last_number: number
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          brand_id: number
          created_at?: string
          id?: string
          last_number?: number
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          brand_id?: number
          created_at?: string
          id?: string
          last_number?: number
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_number_counters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          branch_id: string
          brand_id: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_account_id: string | null
          purchase_date: string
          purchase_number: string
          status: string
          supplier_name: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          brand_id: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_account_id?: string | null
          purchase_date?: string
          purchase_number: string
          status?: string
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          brand_id?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_account_id?: string | null
          purchase_date?: string
          purchase_number?: string
          status?: string
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_notes: {
        Row: {
          branch_id: string
          brand_id: number
          content: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          note_type: string
          service_id: string
        }
        Insert: {
          branch_id: string
          brand_id: number
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          note_type?: string
          service_id: string
        }
        Update: {
          branch_id?: string
          brand_id?: number
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          note_type?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_notes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_notes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_notes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_number_counters: {
        Row: {
          brand_id: number
          counter_date: string
          created_at: string
          last_number: number
          updated_at: string
        }
        Insert: {
          brand_id: number
          counter_date?: string
          created_at?: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          brand_id?: number
          counter_date?: string
          created_at?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_number_counters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      service_payments: {
        Row: {
          branch_id: string
          brand_id: number
          created_at: string
          created_by: string | null
          gross_amount: number
          id: string
          idempotency_key: string | null
          mdr_amount: number
          metadata: Json
          net_amount: number
          notes: string | null
          paid_at: string
          payment_account_id: string
          payment_account_movement_id: string | null
          payment_method_id: string
          payment_number: string
          payment_status: string
          service_id: string
        }
        Insert: {
          branch_id: string
          brand_id: number
          created_at?: string
          created_by?: string | null
          gross_amount: number
          id?: string
          idempotency_key?: string | null
          mdr_amount?: number
          metadata?: Json
          net_amount: number
          notes?: string | null
          paid_at?: string
          payment_account_id: string
          payment_account_movement_id?: string | null
          payment_method_id: string
          payment_number: string
          payment_status?: string
          service_id: string
        }
        Update: {
          branch_id?: string
          brand_id?: number
          created_at?: string
          created_by?: string | null
          gross_amount?: number
          id?: string
          idempotency_key?: string | null
          mdr_amount?: number
          metadata?: Json
          net_amount?: number
          notes?: string | null
          paid_at?: string
          payment_account_id?: string
          payment_account_movement_id?: string | null
          payment_method_id?: string
          payment_number?: string
          payment_status?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_payments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_payments_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_payments_payment_account_movement_id_fkey"
            columns: ["payment_account_movement_id"]
            isOneToOne: false
            referencedRelation: "payment_account_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_photos: {
        Row: {
          branch_id: string
          brand_id: number
          caption: string | null
          created_at: string
          id: string
          metadata: Json
          photo_type: string | null
          public_url: string | null
          service_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          branch_id: string
          brand_id: number
          caption?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          photo_type?: string | null
          public_url?: string | null
          service_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          branch_id?: string
          brand_id?: number
          caption?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          photo_type?: string | null
          public_url?: string | null
          service_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_photos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_photos_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_photos_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_sparepart_usages: {
        Row: {
          barcode_snapshot: string | null
          battery_health_snapshot: number | null
          branch_id: string
          brand_id: number
          condition_grade_snapshot: string | null
          condition_notes_snapshot: string | null
          created_at: string
          created_by: string | null
          id: string
          imei_snapshot: string | null
          inventory_item_id: string
          inventory_movement_id: string | null
          is_returned: boolean
          item_name_snapshot: string | null
          metadata: Json
          notes: string | null
          quantity: number
          returned_inventory_movement_id: string | null
          selling_price: number | null
          selling_price_snapshot: number | null
          serial_number_snapshot: string | null
          serialized_unit_id: string | null
          service_id: string
          sku_snapshot: string | null
          total_cost_snapshot: number | null
          total_price_snapshot: number | null
          unit_cost: number | null
          unit_cost_snapshot: number | null
          unit_snapshot: string | null
          variant_snapshot: Json | null
        }
        Insert: {
          barcode_snapshot?: string | null
          battery_health_snapshot?: number | null
          branch_id: string
          brand_id: number
          condition_grade_snapshot?: string | null
          condition_notes_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          imei_snapshot?: string | null
          inventory_item_id: string
          inventory_movement_id?: string | null
          is_returned?: boolean
          item_name_snapshot?: string | null
          metadata?: Json
          notes?: string | null
          quantity: number
          returned_inventory_movement_id?: string | null
          selling_price?: number | null
          selling_price_snapshot?: number | null
          serial_number_snapshot?: string | null
          serialized_unit_id?: string | null
          service_id: string
          sku_snapshot?: string | null
          total_cost_snapshot?: number | null
          total_price_snapshot?: number | null
          unit_cost?: number | null
          unit_cost_snapshot?: number | null
          unit_snapshot?: string | null
          variant_snapshot?: Json | null
        }
        Update: {
          barcode_snapshot?: string | null
          battery_health_snapshot?: number | null
          branch_id?: string
          brand_id?: number
          condition_grade_snapshot?: string | null
          condition_notes_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          imei_snapshot?: string | null
          inventory_item_id?: string
          inventory_movement_id?: string | null
          is_returned?: boolean
          item_name_snapshot?: string | null
          metadata?: Json
          notes?: string | null
          quantity?: number
          returned_inventory_movement_id?: string | null
          selling_price?: number | null
          selling_price_snapshot?: number | null
          serial_number_snapshot?: string | null
          serialized_unit_id?: string | null
          service_id?: string
          sku_snapshot?: string | null
          total_cost_snapshot?: number | null
          total_price_snapshot?: number | null
          unit_cost?: number | null
          unit_cost_snapshot?: number | null
          unit_snapshot?: string | null
          variant_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "service_sparepart_usages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_inventory_movement_id_fkey"
            columns: ["inventory_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_returned_inventory_movement_id_fkey"
            columns: ["returned_inventory_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_serialized_unit_id_fkey"
            columns: ["serialized_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_serialized_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sparepart_usages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_status_history: {
        Row: {
          branch_id: string
          brand_id: number
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          metadata: Json
          reason: string | null
          service_id: string
          to_status: string
        }
        Insert: {
          branch_id: string
          brand_id: number
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          service_id: string
          to_status: string
        }
        Update: {
          branch_id?: string
          brand_id?: number
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          service_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_status_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_status_history_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_status_history_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          assigned_technician_id: string | null
          branch_id: string
          brand_id: number
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          current_status: string
          customer_id: string | null
          deleted_at: string | null
          device_brand: string | null
          device_color: string | null
          device_imei: string | null
          device_model: string | null
          device_serial_number: string | null
          device_type: string | null
          diagnosis_at: string | null
          diagnosis_result: string | null
          done_at: string | null
          estimated_cost: number
          final_cost: number
          id: string
          intake_at: string
          metadata: Json
          picked_up_at: string | null
          picked_up_by_profile_id: string | null
          pickup_name: string | null
          pickup_note: string | null
          pickup_phone: string | null
          pickup_relation: string | null
          previous_status: string | null
          qc_at: string | null
          repairing_at: string | null
          reported_issue: string
          service_number: string
          solution_notes: string | null
          updated_at: string
          updated_by: string | null
          waiting_approval_at: string | null
          warranty_until: string | null
        }
        Insert: {
          assigned_technician_id?: string | null
          branch_id: string
          brand_id: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string
          customer_id?: string | null
          deleted_at?: string | null
          device_brand?: string | null
          device_color?: string | null
          device_imei?: string | null
          device_model?: string | null
          device_serial_number?: string | null
          device_type?: string | null
          diagnosis_at?: string | null
          diagnosis_result?: string | null
          done_at?: string | null
          estimated_cost?: number
          final_cost?: number
          id?: string
          intake_at?: string
          metadata?: Json
          picked_up_at?: string | null
          picked_up_by_profile_id?: string | null
          pickup_name?: string | null
          pickup_note?: string | null
          pickup_phone?: string | null
          pickup_relation?: string | null
          previous_status?: string | null
          qc_at?: string | null
          repairing_at?: string | null
          reported_issue: string
          service_number: string
          solution_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          waiting_approval_at?: string | null
          warranty_until?: string | null
        }
        Update: {
          assigned_technician_id?: string | null
          branch_id?: string
          brand_id?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string
          customer_id?: string | null
          deleted_at?: string | null
          device_brand?: string | null
          device_color?: string | null
          device_imei?: string | null
          device_model?: string | null
          device_serial_number?: string | null
          device_type?: string | null
          diagnosis_at?: string | null
          diagnosis_result?: string | null
          done_at?: string | null
          estimated_cost?: number
          final_cost?: number
          id?: string
          intake_at?: string
          metadata?: Json
          picked_up_at?: string | null
          picked_up_by_profile_id?: string | null
          pickup_name?: string | null
          pickup_note?: string | null
          pickup_phone?: string | null
          pickup_relation?: string | null
          previous_status?: string | null
          qc_at?: string | null
          repairing_at?: string | null
          reported_issue?: string
          service_number?: string
          solution_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          waiting_approval_at?: string | null
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shift_cash_movements: {
        Row: {
          amount: number
          branch_id: string
          brand_id: number
          cash_account_id: string
          created_at: string
          created_by: string | null
          description: string | null
          direction: string
          finance_ledger_id: string | null
          id: string
          metadata: Json
          movement_type: string
          payment_account_movement_id: string | null
          shift_id: string
        }
        Insert: {
          amount: number
          branch_id: string
          brand_id: number
          cash_account_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction: string
          finance_ledger_id?: string | null
          id?: string
          metadata?: Json
          movement_type: string
          payment_account_movement_id?: string | null
          shift_id: string
        }
        Update: {
          amount?: number
          branch_id?: string
          brand_id?: number
          cash_account_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string
          finance_ledger_id?: string | null
          id?: string
          metadata?: Json
          movement_type?: string
          payment_account_movement_id?: string | null
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_shift_cash_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shift_cash_movements_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shift_cash_movements_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shift_cash_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shift_cash_movements_finance_ledger_id_fkey"
            columns: ["finance_ledger_id"]
            isOneToOne: false
            referencedRelation: "finance_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shift_cash_movements_payment_account_movement_id_fkey"
            columns: ["payment_account_movement_id"]
            isOneToOne: false
            referencedRelation: "payment_account_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shift_cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "reporting_store_shift_summary"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "store_shift_cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "store_shift_summary"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "store_shift_cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "store_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shift_number_counters: {
        Row: {
          brand_id: number
          last_number: number
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          brand_id: number
          last_number?: number
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          brand_id?: number
          last_number?: number
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_shift_number_counters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shifts: {
        Row: {
          branch_id: string
          brand_id: number
          cash_account_id: string
          cash_difference: number | null
          closed_at: string | null
          closed_by: string | null
          closing_notes: string | null
          counted_closing_cash: number | null
          created_at: string
          expected_closing_cash: number | null
          id: string
          metadata: Json
          opened_at: string
          opened_by: string | null
          opening_cash: number
          opening_difference: number
          opening_notes: string | null
          previous_closing_cash: number | null
          shift_number: string
          shift_status: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          brand_id: number
          cash_account_id: string
          cash_difference?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_notes?: string | null
          counted_closing_cash?: number | null
          created_at?: string
          expected_closing_cash?: number | null
          id?: string
          metadata?: Json
          opened_at?: string
          opened_by?: string | null
          opening_cash?: number
          opening_difference?: number
          opening_notes?: string | null
          previous_closing_cash?: number | null
          shift_number: string
          shift_status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          brand_id?: number
          cash_account_id?: string
          cash_difference?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_notes?: string | null
          counted_closing_cash?: number | null
          created_at?: string
          expected_closing_cash?: number | null
          id?: string
          metadata?: Json
          opened_at?: string
          opened_by?: string | null
          opening_cash?: number
          opening_difference?: number
          opening_notes?: string | null
          previous_closing_cash?: number | null
          shift_number?: string
          shift_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_ins: {
        Row: {
          appraisal_value: number
          appraised_by: string | null
          battery_health: string | null
          branch_id: string
          brand_id: number
          color: string | null
          condition_grade: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          device_brand: string
          device_model: string
          id: string
          imei: string | null
          inventory_item_id: string | null
          inventory_item_unit_id: string | null
          note: string | null
          pos_sale_id: string
          serial_number: string | null
          status: string
          storage: string | null
          updated_at: string
        }
        Insert: {
          appraisal_value: number
          appraised_by?: string | null
          battery_health?: string | null
          branch_id: string
          brand_id: number
          color?: string | null
          condition_grade?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          device_brand: string
          device_model: string
          id?: string
          imei?: string | null
          inventory_item_id?: string | null
          inventory_item_unit_id?: string | null
          note?: string | null
          pos_sale_id: string
          serial_number?: string | null
          status?: string
          storage?: string | null
          updated_at?: string
        }
        Update: {
          appraisal_value?: number
          appraised_by?: string | null
          battery_health?: string | null
          branch_id?: string
          brand_id?: number
          color?: string | null
          condition_grade?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          device_brand?: string
          device_model?: string
          id?: string
          imei?: string | null
          inventory_item_id?: string | null
          inventory_item_unit_id?: string | null
          note?: string | null
          pos_sale_id?: string
          serial_number?: string | null
          status?: string
          storage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_ins_appraised_by_fkey"
            columns: ["appraised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ins_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ins_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ins_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ins_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ins_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "trade_ins_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "trade_ins_inventory_item_unit_id_fkey"
            columns: ["inventory_item_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_item_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ins_pos_sale_id_fkey"
            columns: ["pos_sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_reversals: {
        Row: {
          branch_id: string | null
          brand_id: number
          created_at: string
          id: string
          idempotency_key: string | null
          metadata: Json
          original_amount: number
          payment_account_movement_id: string | null
          reason: string
          reversal_type: string
          reversed_amount: number
          reversed_at: string
          reversed_by: string | null
          source_id: string
          source_type: string
        }
        Insert: {
          branch_id?: string | null
          brand_id: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          original_amount: number
          payment_account_movement_id?: string | null
          reason: string
          reversal_type: string
          reversed_amount: number
          reversed_at?: string
          reversed_by?: string | null
          source_id: string
          source_type: string
        }
        Update: {
          branch_id?: string | null
          brand_id?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          original_amount?: number
          payment_account_movement_id?: string | null
          reason?: string
          reversal_type?: string
          reversed_amount?: number
          reversed_at?: string
          reversed_by?: string | null
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_reversals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_reversals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_reversals_payment_account_movement_id_fkey"
            columns: ["payment_account_movement_id"]
            isOneToOne: false
            referencedRelation: "payment_account_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_reversals_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branch_access: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          membership_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          membership_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_access_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "brand_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_access_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "user_brand_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      user_brand_memberships: {
        Row: {
          brand_id: number | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          profile_id: string
          role: string
          updated_at: string
        }
        Insert: {
          brand_id?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          profile_id: string
          role: string
          updated_at?: string
        }
        Update: {
          brand_id?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          profile_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_brand_memberships_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_brand_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      branch_revenue_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          cash_adjustment: number | null
          cogs: number | null
          mdr_expense: number | null
          net_profit: number | null
          operating_expense: number | null
          other_income: number | null
          pos_revenue: number | null
          service_revenue: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_memberships: {
        Row: {
          brand_id: number | null
          created_at: string | null
          deleted_at: string | null
          id: string | null
          is_active: boolean | null
          profile_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          is_active?: boolean | null
          profile_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          is_active?: boolean | null
          profile_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_brand_memberships_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_brand_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_finance_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          cash_adjustment: number | null
          cogs: number | null
          ledger_date: string | null
          mdr_expense: number | null
          net_profit: number | null
          operating_expense: number | null
          other_income: number | null
          payment_refund: number | null
          pos_revenue: number | null
          service_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_listing: {
        Row: {
          appears_in_pos: boolean | null
          available_stock: number | null
          average_cost: number | null
          barcode: string | null
          branch_id: string | null
          branch_name: string | null
          brand_id: number | null
          category_id: string | null
          category_name: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          has_variants: boolean | null
          id: string | null
          is_active: boolean | null
          is_variant_parent: boolean | null
          item_type: string | null
          metadata: Json | null
          min_stock: number | null
          name: string | null
          parent_item_id: string | null
          reserved_stock: number | null
          selling_price: number | null
          service_usage_enabled: boolean | null
          sku: string | null
          stock_type: string | null
          tracking_type: string | null
          unit_attributes: Json | null
          unit_condition: string | null
          unit_name: string | null
          updated_at: string | null
          variant_attributes: Json | null
          variant_display_name: string | null
          variant_name: string | null
          variant_option_values: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_stocks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "reporting_inventory_stock_summary"
            referencedColumns: ["item_id"]
          },
        ]
      }
      inventory_stock_summary: {
        Row: {
          available_stock: number | null
          branch_id: string | null
          brand_id: number | null
          current_stock: number | null
          item_id: string | null
          item_name: string | null
          item_type: string | null
          min_stock: number | null
          reserved_stock: number | null
          sku: string | null
          stock_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_stocks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_finance_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          cash_adjustment: number | null
          cogs: number | null
          mdr_expense: number | null
          month: number | null
          net_profit: number | null
          operating_expense: number | null
          other_income: number | null
          payment_refund: number | null
          pos_revenue: number | null
          service_revenue: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          payment_method_id: string | null
          payment_method_name: string | null
          payment_method_type: string | null
          total_gross_amount: number | null
          total_mdr_amount: number | null
          total_net_amount: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      reporting_branch_revenue_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          cash_adjustment: number | null
          cogs: number | null
          mdr_expense: number | null
          net_profit: number | null
          operating_expense: number | null
          other_income: number | null
          pos_revenue: number | null
          service_revenue: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_daily_finance_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          cash_adjustment: number | null
          cogs: number | null
          ledger_date: string | null
          mdr_expense: number | null
          net_profit: number | null
          operating_expense: number | null
          other_income: number | null
          payment_refund: number | null
          pos_revenue: number | null
          service_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_inventory_stock_summary: {
        Row: {
          available_stock: number | null
          branch_id: string | null
          brand_id: number | null
          current_stock: number | null
          item_id: string | null
          item_name: string | null
          item_type: string | null
          min_stock: number | null
          reserved_stock: number | null
          sku: string | null
          stock_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_stocks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_monthly_finance_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          cash_adjustment: number | null
          cogs: number | null
          mdr_expense: number | null
          month: number | null
          net_profit: number | null
          operating_expense: number | null
          other_income: number | null
          payment_refund: number | null
          pos_revenue: number | null
          service_revenue: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_payment_method_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          payment_method_id: string | null
          payment_method_name: string | null
          payment_method_type: string | null
          total_gross_amount: number | null
          total_mdr_amount: number | null
          total_net_amount: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      reporting_service_status_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          current_status: string | null
          service_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_store_shift_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          cash_difference: number | null
          closed_at: string | null
          closed_by: string | null
          closed_by_name: string | null
          counted_closing_cash: number | null
          duration_minutes: number | null
          expected_closing_cash: number | null
          opened_at: string | null
          opened_by: string | null
          opened_by_name: string | null
          opening_cash: number | null
          shift_id: string | null
          shift_number: string | null
          shift_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_status_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          current_status: string | null
          service_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shift_summary: {
        Row: {
          branch_id: string | null
          brand_id: number | null
          cash_difference: number | null
          closed_at: string | null
          closed_by: string | null
          closed_by_name: string | null
          counted_closing_cash: number | null
          duration_minutes: number | null
          expected_closing_cash: number | null
          opened_at: string | null
          opened_by: string | null
          opened_by_name: string | null
          opening_cash: number | null
          shift_id: string | null
          shift_number: string | null
          shift_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shifts_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_finance_ledger_entry: {
        Args: {
          p_account_code?: string
          p_amount: number
          p_branch_id?: string
          p_brand_id: number
          p_category?: string
          p_created_by?: string
          p_description?: string
          p_direction: string
          p_entry_type: string
          p_idempotency_key?: string
          p_ledger_date?: string
          p_metadata?: Json
          p_occurred_at?: string
          p_reference_id?: string
          p_reference_type?: string
          p_source_id?: string
          p_source_table?: string
        }
        Returns: string
      }
      add_inventory_movement:
        | {
            Args: {
              p_branch_id: string
              p_brand_id: number
              p_created_by?: string
              p_description?: string
              p_direction: string
              p_item_id: string
              p_metadata?: Json
              p_movement_type: string
              p_quantity: number
              p_reference_id?: string
              p_reference_type?: string
              p_unit_cost?: number
            }
            Returns: string
          }
        | {
            Args: {
              p_branch_id: string
              p_brand_id: number
              p_created_by?: string
              p_description?: string
              p_direction: string
              p_idempotency_key?: string
              p_item_id: string
              p_metadata?: Json
              p_movement_type: string
              p_quantity: number
              p_reference_id?: string
              p_reference_type?: string
              p_unit_cost?: number
            }
            Returns: string
          }
        | {
            Args: {
              p_branch_id: string
              p_brand_id: number
              p_created_by?: string
              p_description?: string
              p_direction: string
              p_idempotency_key?: string
              p_item_id: string
              p_metadata?: Json
              p_movement_type: string
              p_notes?: string
              p_quantity: number
              p_reference_id?: string
              p_reference_label?: string
              p_reference_type?: string
              p_serialized_unit_id?: string
              p_unit_cost?: number
              p_unit_snapshot?: string
            }
            Returns: string
          }
      add_payment_account_movement: {
        Args: {
          p_amount: number
          p_branch_id?: string
          p_brand_id: number
          p_created_by?: string
          p_description?: string
          p_direction: string
          p_metadata?: Json
          p_movement_type: string
          p_payment_account_id: string
          p_reference_id?: string
          p_reference_type?: string
          p_transfer_group_id?: string
        }
        Returns: string
      }
      add_service_sparepart_usage:
        | {
            Args: {
              p_created_by?: string
              p_idempotency_key?: string
              p_inventory_item_id: string
              p_notes?: string
              p_quantity: number
              p_selling_price?: number
              p_service_id: string
              p_unit_cost?: number
            }
            Returns: string
          }
        | {
            Args: {
              p_created_by?: string
              p_idempotency_key?: string
              p_inventory_item_id: string
              p_notes?: string
              p_quantity: number
              p_selling_price?: number
              p_serialized_unit_id?: string
              p_service_id: string
              p_unit_cost?: number
            }
            Returns: string
          }
      add_shift_cash_movement: {
        Args: {
          p_amount: number
          p_created_by?: string
          p_description?: string
          p_direction: string
          p_metadata?: Json
          p_shift_id: string
        }
        Returns: string
      }
      calculate_branch_item_stock: {
        Args: { p_branch_id: string; p_item_id: string }
        Returns: number
      }
      calculate_payment_account_balance: {
        Args: { p_account_id: string }
        Returns: number
      }
      calculate_pos_mdr: {
        Args: {
          p_amount: number
          p_mdr_percentage?: number
          p_method_type: string
        }
        Returns: number
      }
      calculate_pos_sale_summary: {
        Args: { p_pos_sale_id: string }
        Returns: Json
      }
      calculate_service_payment_mdr: {
        Args: {
          p_amount: number
          p_mdr_percentage?: number
          p_method_type: string
        }
        Returns: number
      }
      calculate_service_payment_summary: {
        Args: { p_service_id: string }
        Returns: Json
      }
      calculate_shift_expected_cash: {
        Args: { p_shift_id: string }
        Returns: number
      }
      close_store_shift: {
        Args: {
          p_closed_by?: string
          p_closing_notes?: string
          p_counted_closing_cash: number
          p_metadata?: Json
          p_shift_id: string
        }
        Returns: Json
      }
      create_default_cash_account_for_branch: {
        Args: { p_branch_id: string; p_branch_name: string; p_brand_id: number }
        Returns: string
      }
      create_inv_stock_purchase: {
        Args: {
          p_branch_id: string
          p_brand_id: number
          p_created_by: string
          p_items: Json
          p_notes: string
          p_payment_account_id: string
          p_purchase_date: string
          p_supplier_name: string
        }
        Returns: Json
      }
      create_purchase_with_movements: {
        Args: {
          p_branch_id: string
          p_brand_id: number
          p_created_by: string
          p_items: Json
          p_notes: string
          p_payment_account_id: string
          p_purchase_date: string
          p_purchase_number: string
          p_supplier_name: string
        }
        Returns: Json
      }
      create_trade_in_inventory_unit: {
        Args: {
          p_appraisal_value?: number
          p_battery_health?: string
          p_branch_id: string
          p_brand_id: number
          p_color?: string
          p_condition_grade?: string
          p_created_by?: string
          p_device_brand: string
          p_device_model: string
          p_imei?: string
          p_note?: string
          p_serial_number?: string
          p_storage?: string
        }
        Returns: Json
      }
      generate_inv_stock_purchase_number: {
        Args: { p_branch_id: string; p_brand_id: number }
        Returns: string
      }
      generate_pos_sale_number: {
        Args: { p_brand_id: number }
        Returns: string
      }
      generate_pos_transaction_number: {
        Args: { p_brand_id: number; p_prefix?: string }
        Returns: string
      }
      generate_purchase_number: {
        Args: { p_brand_id: number }
        Returns: string
      }
      generate_service_number: { Args: { p_brand_id: number }; Returns: string }
      generate_service_payment_number: {
        Args: { p_brand_id: number }
        Returns: string
      }
      generate_store_shift_number: {
        Args: { p_brand_id: number }
        Returns: string
      }
      get_branch_active_shift: { Args: { p_branch_id: string }; Returns: Json }
      get_user_branch_ids: { Args: never; Returns: string[] }
      get_user_brand_ids: { Args: never; Returns: number[] }
      get_user_profile_id: { Args: never; Returns: string }
      get_user_roles: { Args: never; Returns: string[] }
      mark_device_unit_sold: {
        Args: { p_unit_id: string; p_updated_by?: string }
        Returns: Json
      }
      open_store_shift: {
        Args: {
          p_branch_id: string
          p_brand_id: number
          p_metadata?: Json
          p_opened_by?: string
          p_opening_cash: number
          p_opening_notes?: string
        }
        Returns: string
      }
      recalculate_serialized_item_stock: {
        Args: { p_item_id: string }
        Returns: number
      }
      record_pos_sale: {
        Args: {
          p_branch_id: string
          p_brand_id: number
          p_created_by?: string
          p_customer_id?: string
          p_discount_amount?: number
          p_idempotency_key?: string
          p_items: Json
          p_metadata?: Json
          p_notes?: string
          p_payment_method_id: string
          p_sold_at?: string
        }
        Returns: Json
      }
      record_pos_sale_v2: {
        Args: {
          p_branch_id: string
          p_brand_id: number
          p_created_by?: string
          p_customer_id?: string
          p_discount_amount?: number
          p_idempotency_key?: string
          p_items: Json
          p_metadata?: Json
          p_notes?: string
          p_payment_amount: number
          p_payment_method_id: string
          p_sold_at?: string
          p_trade_in?: Json
        }
        Returns: Json
      }
      record_service_payment: {
        Args: {
          p_amount: number
          p_created_by?: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_notes?: string
          p_paid_at?: string
          p_payment_method_id: string
          p_service_id: string
        }
        Returns: Json
      }
      record_service_payment_finance_entries: {
        Args: { p_created_by?: string; p_service_payment_id: string }
        Returns: Json
      }
      refund_pos_sale: {
        Args: {
          p_created_by?: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_pos_sale_id: string
          p_reason: string
        }
        Returns: Json
      }
      refund_service_payment: {
        Args: {
          p_created_by?: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_reason: string
          p_service_payment_id: string
        }
        Returns: Json
      }
      resolve_pos_payment_account: {
        Args: {
          p_branch_id: string
          p_brand_id: number
          p_payment_method_id: string
        }
        Returns: Json
      }
      resolve_service_payment_account: {
        Args: {
          p_branch_id: string
          p_brand_id: number
          p_payment_method_id: string
        }
        Returns: Json
      }
      return_service_sparepart_usage: {
        Args: { p_reason?: string; p_returned_by?: string; p_usage_id: string }
        Returns: string
      }
      sync_branch_inventory_stock: {
        Args: { p_branch_id: string; p_item_id: string }
        Returns: number
      }
      transition_service_status: {
        Args: {
          p_changed_by?: string
          p_metadata?: Json
          p_reason?: string
          p_service_id: string
          p_to_status: string
        }
        Returns: Json
      }
      validate_service_status_transition: {
        Args: { p_from_status: string; p_to_status: string }
        Returns: boolean
      }
      void_pos_sale: {
        Args: {
          p_created_by?: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_pos_sale_id: string
          p_reason: string
        }
        Returns: Json
      }
      void_service_payment: {
        Args: {
          p_created_by?: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_reason: string
          p_service_payment_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      inventory_item_type: "PRODUCT" | "SPAREPART" | "SUPPLY" | "OTHER"
      inventory_movement_direction: "IN" | "OUT"
      inventory_movement_type:
        | "OPENING_STOCK"
        | "PURCHASE"
        | "SERVICE_USAGE"
        | "SERVICE_RETURN"
        | "POS_SALE"
        | "POS_RETURN"
        | "ADJUSTMENT_IN"
        | "ADJUSTMENT_OUT"
        | "DAMAGE"
        | "TRANSFER_IN"
        | "TRANSFER_OUT"
      payment_account_direction: "IN" | "OUT"
      payment_account_movement_type:
        | "OPENING_BALANCE"
        | "BALANCE_ADJUSTMENT"
        | "SERVICE_PAYMENT"
        | "POS_PAYMENT"
        | "OTHER_INCOME"
        | "OPERATING_EXPENSE"
        | "STOCK_PURCHASE"
        | "STOCK_PURCHASE_PAYMENT"
        | "TRANSFER_IN"
        | "TRANSFER_OUT"
        | "BANK_FEE"
        | "QRIS_SETTLEMENT"
        | "SERVICE_REFUND"
        | "POS_REFUND"
      payment_account_type:
        | "CASH"
        | "BANK"
        | "QRIS"
        | "TRANSFER"
        | "DEBIT"
        | "OTHER"
      payment_method_type:
        | "CASH"
        | "QRIS"
        | "TRANSFER"
        | "DEBIT"
        | "CREDIT"
        | "EWALLET"
      user_role:
        | "PLATFORM_OWNER"
        | "MASTER_ADMIN"
        | "ADMIN"
        | "FRONTLINER"
        | "TECHNICIAN"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      inventory_item_type: ["PRODUCT", "SPAREPART", "SUPPLY", "OTHER"],
      inventory_movement_direction: ["IN", "OUT"],
      inventory_movement_type: [
        "OPENING_STOCK",
        "PURCHASE",
        "SERVICE_USAGE",
        "SERVICE_RETURN",
        "POS_SALE",
        "POS_RETURN",
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
        "DAMAGE",
        "TRANSFER_IN",
        "TRANSFER_OUT",
      ],
      payment_account_direction: ["IN", "OUT"],
      payment_account_movement_type: [
        "OPENING_BALANCE",
        "BALANCE_ADJUSTMENT",
        "SERVICE_PAYMENT",
        "POS_PAYMENT",
        "OTHER_INCOME",
        "OPERATING_EXPENSE",
        "STOCK_PURCHASE",
        "STOCK_PURCHASE_PAYMENT",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "BANK_FEE",
        "QRIS_SETTLEMENT",
        "SERVICE_REFUND",
        "POS_REFUND",
      ],
      payment_account_type: [
        "CASH",
        "BANK",
        "QRIS",
        "TRANSFER",
        "DEBIT",
        "OTHER",
      ],
      payment_method_type: [
        "CASH",
        "QRIS",
        "TRANSFER",
        "DEBIT",
        "CREDIT",
        "EWALLET",
      ],
      user_role: [
        "PLATFORM_OWNER",
        "MASTER_ADMIN",
        "ADMIN",
        "FRONTLINER",
        "TECHNICIAN",
      ],
    },
  },
} as const
