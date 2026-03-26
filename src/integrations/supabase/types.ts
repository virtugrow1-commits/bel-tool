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
      incoming_calls: {
        Row: {
          call_id: string | null
          called_number: string | null
          caller_name: string | null
          caller_number: string
          company_name: string | null
          contact_id: string | null
          created_at: string
          id: string
          organization_id: string | null
          status: string
        }
        Insert: {
          call_id?: string | null
          called_number?: string | null
          caller_name?: string | null
          caller_number: string
          company_name?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          status?: string
        }
        Update: {
          call_id?: string | null
          called_number?: string | null
          caller_name?: string | null
          caller_number?: string
          company_name?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          booking_link: string | null
          brand_name: string | null
          created_at: string
          enquete_link: string | null
          ghl_api_key: string | null
          ghl_location_id: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          voys_api_token: string | null
          voys_device_id: string | null
          voys_email: string | null
          voys_outbound_number: string | null
          whatsapp_templates: Json | null
        }
        Insert: {
          booking_link?: string | null
          brand_name?: string | null
          created_at?: string
          enquete_link?: string | null
          ghl_api_key?: string | null
          ghl_location_id?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          voys_api_token?: string | null
          voys_device_id?: string | null
          voys_email?: string | null
          voys_outbound_number?: string | null
          whatsapp_templates?: Json | null
        }
        Update: {
          booking_link?: string | null
          brand_name?: string | null
          created_at?: string
          enquete_link?: string | null
          ghl_api_key?: string | null
          ghl_location_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          voys_api_token?: string | null
          voys_device_id?: string | null
          voys_email?: string | null
          voys_outbound_number?: string | null
          whatsapp_templates?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          device_id: string | null
          email: string
          id: string
          name: string
          organization_id: string | null
          role: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          device_id?: string | null
          email: string
          id?: string
          name: string
          organization_id?: string | null
          role?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          device_id?: string | null
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_scores: {
        Row: {
          afgevallen: number
          afspraken: number
          best_reeks: number
          callbacks: number
          enquetes: number
          gebeld: number
          geen_gehoor: number
          id: string
          organization_id: string | null
          score_date: string
          updated_at: string
          user_id: string
          verstuurd: number
        }
        Insert: {
          afgevallen?: number
          afspraken?: number
          best_reeks?: number
          callbacks?: number
          enquetes?: number
          gebeld?: number
          geen_gehoor?: number
          id?: string
          organization_id?: string | null
          score_date?: string
          updated_at?: string
          user_id: string
          verstuurd?: number
        }
        Update: {
          afgevallen?: number
          afspraken?: number
          best_reeks?: number
          callbacks?: number
          enquetes?: number
          gebeld?: number
          geen_gehoor?: number
          id?: string
          organization_id?: string | null
          score_date?: string
          updated_at?: string
          user_id?: string
          verstuurd?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
