export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string | null
          business_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          activity_type?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          activity_type?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bill_of_materials: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          material_details: Json | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          material_details?: Json | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          material_details?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_of_materials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bill_of_materials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_of_materials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
        ]
      }
      bom_materials: {
        Row: {
          bom_id: string
          id: string
          item_id: string
          quantity: number
          unit_of_measure: string
        }
        Insert: {
          bom_id: string
          id?: string
          item_id: string
          quantity: number
          unit_of_measure: string
        }
        Update: {
          bom_id?: string
          id?: string
          item_id?: string
          quantity?: number
          unit_of_measure?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_materials_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "boms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_materials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      boms: {
        Row: {
          created_at: string
          description: string | null
          finished_item_id: string | null
          id: string
          product_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          finished_item_id?: string | null
          id?: string
          product_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          finished_item_id?: string | null
          id?: string
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "boms_finished_item_id_fkey"
            columns: ["finished_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          email: string | null
          grace_period_end_date: string | null
          id: string
          is_active: boolean | null
          is_custom_plan: boolean | null
          logo_url: string | null
          manager_id: string | null
          max_users: number | null
          name: string
          phone_number: string | null
          postal_code: string | null
          state_province: string | null
          status: string
          subscription_end_date: string | null
          subscription_plan: string
          subscription_start_date: string | null
          subscription_status: string | null
          tax_id: string | null
          trial_end_date: string | null
          trial_start_date: string | null
        }
        Insert: {
          address?: string | null
          business_address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          grace_period_end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_custom_plan?: boolean | null
          logo_url?: string | null
          manager_id?: string | null
          max_users?: number | null
          name: string
          phone_number?: string | null
          postal_code?: string | null
          state_province?: string | null
          status: string
          subscription_end_date?: string | null
          subscription_plan?: string
          subscription_start_date?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
        }
        Update: {
          address?: string | null
          business_address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          grace_period_end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_custom_plan?: boolean | null
          logo_url?: string | null
          manager_id?: string | null
          max_users?: number | null
          name?: string
          phone_number?: string | null
          postal_code?: string | null
          state_province?: string | null
          status?: string
          subscription_end_date?: string | null
          subscription_plan?: string
          subscription_start_date?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          organization_id: string | null
          subject: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          organization_id?: string | null
          subject: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          organization_id?: string | null
          subject?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          business_id: string | null
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          payment_method: string
          reference_number: string | null
          type: string
        }
        Insert: {
          amount: number
          business_id?: string | null
          category: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          payment_method: string
          reference_number?: string | null
          type: string
        }
        Update: {
          amount?: number
          business_id?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          payment_method?: string
          reference_number?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
        ]
      }
      goods_received_note_items: {
        Row: {
          created_at: string
          grn_id: string | null
          id: string
          item_id: string | null
          notes: string | null
          purchase_order_item_id: string | null
          quantity_received: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          grn_id?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          purchase_order_item_id?: string | null
          quantity_received: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          grn_id?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          purchase_order_item_id?: string | null
          quantity_received?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_note_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_note_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_note_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_received_notes: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string | null
          purchase_order_id: string | null
          receipt_number: string
          received_by: string | null
          received_date: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          purchase_order_id?: string | null
          receipt_number: string
          received_by?: string | null
          received_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          purchase_order_id?: string | null
          receipt_number?: string
          received_by?: string | null
          received_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "goods_received_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "goods_received_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjustment_date: string
          created_by: string | null
          id: string
          item_id: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          reason: string
        }
        Insert: {
          adjustment_date?: string
          created_by?: string | null
          id?: string
          item_id: string
          new_quantity: number
          notes?: string | null
          previous_quantity: number
          reason: string
        }
        Update: {
          adjustment_date?: string
          created_by?: string | null
          id?: string
          item_id?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          business_id: string | null
          category: string | null
          created_at: string
          current_stock: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          purchase_cost: number
          reorder_level: number
          selling_price: number
          sku: string | null
          unit_of_measure: string
          updated_at: string
          // New fields for Selling/Crafting items
          item_category: string | null
          item_type: string | null
          purchased_date: string | null
          discount_percentage: number | null
          product_types: Json | null
          // E-commerce fields
          is_website_item: boolean | null
          image_url: string | null
          additional_images: string | null
          specifications: string | null
          weight: number | null
          dimensions: string | null
          url_slug: string | null
          meta_description: string | null
          is_featured: boolean | null
          sale_price: number | null
        }
        Insert: {
          business_id?: string | null
          category?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          purchase_cost: number
          reorder_level?: number
          selling_price: number
          sku?: string | null
          unit_of_measure: string
          updated_at?: string
          // New fields for Selling/Crafting items
          item_category?: string | null
          item_type?: string | null
          purchased_date?: string | null
          discount_percentage?: number | null
          product_types?: Json | null
          // E-commerce fields
          is_website_item?: boolean | null
          image_url?: string | null
          additional_images?: string | null
          specifications?: string | null
          weight?: number | null
          dimensions?: string | null
          url_slug?: string | null
          meta_description?: string | null
          is_featured?: boolean | null
          sale_price?: number | null
        }
        Update: {
          business_id?: string | null
          category?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          purchase_cost?: number
          reorder_level?: number
          selling_price?: number
          sku?: string | null
          unit_of_measure?: string
          updated_at?: string
          // New fields for Selling/Crafting items
          item_category?: string | null
          item_type?: string | null
          purchased_date?: string | null
          discount_percentage?: number | null
          product_types?: Json | null
          // E-commerce fields
          is_website_item?: boolean | null
          image_url?: string | null
          additional_images?: string | null
          specifications?: string | null
          weight?: number | null
          dimensions?: string | null
          url_slug?: string | null
          meta_description?: string | null
          is_featured?: boolean | null
          sale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_number: string
          paid_at: string | null
          sales_order_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_number: string
          paid_at?: string | null
          sales_order_id: string
          status: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_number?: string
          paid_at?: string | null
          sales_order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          created_at: string
          description: string
          id: string
          organization_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          organization_id?: string | null
          severity: string
          status: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          organization_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturing_orders: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          order_details: Json | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          order_details?: Json | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          order_details?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "manufacturing_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
        ]
      }
      notifications: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_orders: {
        Row: {
          additional_costs: number | null
          batch_id: string | null
          bom_id: string
          completion_date: string | null
          created_at: string
          id: string
          labor_cost: number | null
          quantity_to_produce: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          additional_costs?: number | null
          batch_id?: string | null
          bom_id: string
          completion_date?: string | null
          created_at?: string
          id?: string
          labor_cost?: number | null
          quantity_to_produce: number
          start_date: string
          status: string
          updated_at?: string
        }
        Update: {
          additional_costs?: number | null
          batch_id?: string | null
          bom_id?: string
          completion_date?: string | null
          created_at?: string
          id?: string
          labor_cost?: number | null
          quantity_to_produce?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "boms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          expected_delivery_date: string | null
          id: string
          item_id: string
          notes: string | null
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          remaining_quantity: number | null
          status: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          expected_delivery_date?: string | null
          id?: string
          item_id: string
          notes?: string | null
          purchase_order_id: string
          quantity: number
          received_quantity?: number | null
          remaining_quantity?: number | null
          status?: string | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          expected_delivery_date?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          remaining_quantity?: number | null
          status?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          previous_status: string | null
          purchase_order_id: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          previous_status?: string | null
          purchase_order_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          purchase_order_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_status_history_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string | null
          created_at: string
          created_by: string | null
          delivery_date: string | null
          id: string
          notes: string | null
          order_number: string
          organization_id: string | null
          payment_terms: string | null
          shipping_address: string | null
          status: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          organization_id?: string | null
          payment_terms?: string | null
          shipping_address?: string | null
          status: string
          supplier_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          organization_id?: string | null
          payment_terms?: string | null
          shipping_address?: string | null
          status?: string
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      sales_order_items: {
        Row: {
          discount: number
          id: string
          product_id: string
          quantity: number
          sales_order_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          discount?: number
          id?: string
          product_id: string
          quantity: number
          sales_order_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          discount?: number
          id?: string
          product_id?: string
          quantity?: number
          sales_order_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          business_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          organization_id: string | null
          payment_method: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          organization_id?: string | null
          payment_method: string
          status: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          organization_id?: string | null
          payment_method?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "sales_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_users: number
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_users: number
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_users?: number
          name?: string
          price?: number
        }
        Relationships: []
      }
      supplier_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          position: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          position?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          position?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
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
          created_at: string
          id: string
          name: string
          organization_id: string | null
          payment_terms: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          payment_terms?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          payment_terms?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_businesses: {
        Row: {
          business_id: string | null
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_businesses_business_id"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "fk_user_businesses_business_id"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_businesses_business_id"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "user_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "user_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          business_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_message: string | null
          invited_by: string
          last_sent_at: string | null
          reminder_count: number | null
          role: string
          status: string
          token: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invitation_message?: string | null
          invited_by: string
          last_sent_at?: string | null
          reminder_count?: number | null
          role?: string
          status?: string
          token: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_message?: string | null
          invited_by?: string
          last_sent_at?: string | null
          reminder_count?: number | null
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_usage_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "user_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "subscription_reporting"
            referencedColumns: ["business_id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      business_usage_stats: {
        Row: {
          activity_count: number | null
          business_id: string | null
          business_name: string | null
          created_at: string | null
          days_remaining: number | null
          max_users: number | null
          subscription_status: string | null
          user_count: number | null
        }
        Insert: {
          activity_count?: never
          business_id?: string | null
          business_name?: string | null
          created_at?: string | null
          days_remaining?: never
          max_users?: number | null
          subscription_status?: never
          user_count?: never
        }
        Update: {
          activity_count?: never
          business_id?: string | null
          business_name?: string | null
          created_at?: string | null
          days_remaining?: never
          max_users?: number | null
          subscription_status?: never
          user_count?: never
        }
        Relationships: []
      }
      subscription_reporting: {
        Row: {
          business_id: string | null
          business_name: string | null
          days_remaining: number | null
          grace_period_end_date: string | null
          status: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          trial_end_date: string | null
        }
        Insert: {
          business_id?: string | null
          business_name?: string | null
          days_remaining?: never
          grace_period_end_date?: string | null
          status?: never
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
        }
        Update: {
          business_id?: string | null
          business_name?: string | null
          days_remaining?: never
          grace_period_end_date?: string | null
          status?: never
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_days_remaining: {
        Args: { end_date: string }
        Returns: number
      }
      check_and_expire_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      expire_old_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      extend_subscription: {
        Args: { p_business_id: string; p_months?: number }
        Returns: undefined
      }
      get_business_usage_stats: {
        Args: { business_id: string }
        Returns: {
          activity_count: number | null
          business_id: string | null
          business_name: string | null
          created_at: string | null
          days_remaining: number | null
          max_users: number | null
          subscription_status: string | null
          user_count: number | null
        }[]
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          business_id: string
          business_name: string
          email: string
          role: string
          status: string
          invited_by: string
          inviter_name: string
          expires_at: string
          created_at: string
          invitation_message: string
        }[]
      }
      get_subscription_status: {
        Args: {
          subscription_end_date: string
          trial_end_date: string
          grace_period_end_date: string
        }
        Returns: string
      }
      get_subscriptions_needing_reminders: {
        Args: Record<PropertyKey, never>
        Returns: {
          business_id: string
          business_name: string
          manager_id: string
          manager_email: string
          days_remaining: number
          subscription_end_date: string
        }[]
      }
      increment_reminder_count: {
        Args: { invitation_id: string }
        Returns: number
      }
      process_invitation_acceptance: {
        Args: { p_token: string; p_user_id: string }
        Returns: boolean
      }
      update_subscription_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_belongs_to_business: {
        Args: { business_id: string }
        Returns: boolean
      }
      user_is_business_admin: {
        Args: { business_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
