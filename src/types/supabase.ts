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
  public: {
    Tables: {
      couriers: {
        Row: {
          id: string
          join_date: string
          name: string
          notes: string | null
          phone: string
          status: Database["public"]["Enums"]["courier_status"]
          user_id: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          zone: string
        }
        Insert: {
          id?: string
          join_date?: string
          name: string
          notes?: string | null
          phone: string
          status?: Database["public"]["Enums"]["courier_status"]
          user_id: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          zone: string
        }
        Update: {
          id?: string
          join_date?: string
          name?: string
          notes?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["courier_status"]
          user_id?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "couriers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          target_role: Database["public"]["Enums"]["user_role"] | null
          target_user_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          target_role?: Database["public"]["Enums"]["user_role"] | null
          target_user_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          target_role?: Database["public"]["Enums"]["user_role"] | null
          target_user_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          address: string | null
          id: string
          join_date: string
          phone: string
          status: Database["public"]["Enums"]["seller_status"]
          store_name: string
          user_id: string
        }
        Insert: {
          address?: string | null
          id?: string
          join_date?: string
          phone: string
          status?: Database["public"]["Enums"]["seller_status"]
          store_name: string
          user_id: string
        }
        Update: {
          address?: string | null
          id?: string
          join_date?: string
          phone?: string
          status?: Database["public"]["Enums"]["seller_status"]
          store_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sellers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          admin_id: string
          amount: number
          courier_id: string | null
          date: string
          id: string
          seller_id: string | null
          shipment_count: number
        }
        Insert: {
          admin_id: string
          amount: number
          courier_id?: string | null
          date?: string
          id?: string
          seller_id?: string | null
          shipment_count?: number
        }
        Update: {
          admin_id?: string
          amount?: number
          courier_id?: string | null
          date?: string
          id?: string
          seller_id?: string | null
          shipment_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlements_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          actor: string
          actor_role: Database["public"]["Enums"]["user_role"]
          id: string
          note: string | null
          shipment_id: string
          status: Database["public"]["Enums"]["shipment_status"]
          timestamp: string
        }
        Insert: {
          actor: string
          actor_role: Database["public"]["Enums"]["user_role"]
          id?: string
          note?: string | null
          shipment_id: string
          status: Database["public"]["Enums"]["shipment_status"]
          timestamp?: string
        }
        Update: {
          actor?: string
          actor_role?: Database["public"]["Enums"]["user_role"]
          id?: string
          note?: string | null
          shipment_id?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          address: string
          city: string
          cod_collected: boolean
          courier_collected: boolean | null
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          governorate: string
          id: string
          notes: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          price: number
          seller_id: string | null
          seller_settled: boolean | null
          shipping_fee: number
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_id: string
          updated_at: string
          verification_code: string
        }
        Insert: {
          address: string
          city: string
          cod_collected?: boolean
          courier_collected?: boolean | null
          courier_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          governorate: string
          id?: string
          notes?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          price?: number
          seller_id?: string | null
          seller_settled?: boolean | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_id: string
          updated_at?: string
          verification_code: string
        }
        Update: {
          address?: string
          city?: string
          cod_collected?: boolean
          courier_collected?: boolean | null
          courier_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          governorate?: string
          id?: string
          notes?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          price?: number
          seller_id?: string | null
          seller_settled?: boolean | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_id?: string
          updated_at?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_seller: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_courier: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_current_seller_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_courier_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_new_user: {
        Args: {
          p_email: string
          p_name: string
          p_role: string
          p_phone?: string
          p_meta?: Json
        }
        Returns: Json
      }
      create_user_complete: {
        Args: {
          p_email: string
          p_password: string
          p_name: string
          p_role: string
          p_phone?: string
          p_meta?: Json
        }
        Returns: Json
      }
      assign_courier_rpc: {
        Args: {
          p_shipment_id: string
          p_courier_id: string
        }
        Returns: Json
      }
      update_shipment_status_rpc: {
        Args: {
          p_shipment_id: string
          p_status: string
          p_note?: string
        }
        Returns: Json
      }
      delete_user_rpc: {
        Args: {
          p_user_id: string
          p_delete_related?: boolean
        }
        Returns: Json
      }
    }
    Enums: {
      courier_status: "active" | "offline" | "on_delivery"
      notification_type: "info" | "success" | "warning" | "error"
      payment_type: "COD" | "paid"
      seller_status: "active" | "inactive"
      shipment_status:
        | "pending"
        | "assigned"
        | "out_for_delivery"
        | "delivered"
        | "returned"
        | "cancelled"
      user_role: "admin" | "courier" | "seller"
      user_status: "active" | "inactive"
      vehicle_type: "motorcycle" | "car" | "van"
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
  public: {
    Enums: {
      courier_status: ["active", "offline", "on_delivery"],
      notification_type: ["info", "success", "warning", "error"],
      payment_type: ["COD", "paid"],
      seller_status: ["active", "inactive"],
      shipment_status: [
        "pending",
        "assigned",
        "out_for_delivery",
        "delivered",
        "returned",
        "cancelled",
      ],
      user_role: ["admin", "courier", "seller"],
      user_status: ["active", "inactive"],
      vehicle_type: ["motorcycle", "car", "van"],
    },
  },
} as const
