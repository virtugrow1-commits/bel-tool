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
      call_attempts: {
        Row: {
          attempted_at: string
          caller_id: string | null
          company_id: string
          contact_id: string
          duration_seconds: number
          id: string
          organization_id: string
          result: string
          session_id: string | null
        }
        Insert: {
          attempted_at?: string
          caller_id?: string | null
          company_id?: string
          contact_id: string
          duration_seconds?: number
          id?: string
          organization_id?: string
          result?: string
          session_id?: string | null
        }
        Update: {
          attempted_at?: string
          caller_id?: string | null
          company_id?: string
          contact_id?: string
          duration_seconds?: number
          id?: string
          organization_id?: string
          result?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          caller_id: string | null
          caller_name: string
          company_id: string
          company_name: string
          contact_id: string
          contact_name: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          ghl_synced: boolean
          id: string
          notes: string | null
          organization_id: string
          phone: string
          request_id: string | null
          result: string | null
          source: string
          started_at: string
          sync_error: string | null
          voys_call_id: string | null
        }
        Insert: {
          caller_id?: string | null
          caller_name?: string
          company_id?: string
          company_name?: string
          contact_id: string
          contact_name?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          ghl_synced?: boolean
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string
          request_id?: string | null
          result?: string | null
          source?: string
          started_at?: string
          sync_error?: string | null
          voys_call_id?: string | null
        }
        Update: {
          caller_id?: string | null
          caller_name?: string
          company_id?: string
          company_name?: string
          contact_id?: string
          contact_name?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          ghl_synced?: boolean
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string
          request_id?: string | null
          result?: string | null
          source?: string
          started_at?: string
          sync_error?: string | null
          voys_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      callbacks: {
        Row: {
          assigned_to: string | null
          company_name: string
          contact_id: string
          contact_name: string
          created_at: string
          created_by: string | null
          id: string
          note: string
          organization_id: string
          scheduled_date: string
          scheduled_time: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name?: string
          contact_id: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          organization_id?: string
          scheduled_date: string
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string
          contact_id?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          organization_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "callbacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dnc_list: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          organization_id: string
          phone: string
          phone_norm: string
          reason: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          phone: string
          phone_norm: string
          reason?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          phone?: string
          phone_norm?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "dnc_list_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
          voipzeker_invitation_id: string | null
          voipzeker_login_token: string | null
          voipzeker_outbound_number: string | null
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
          voipzeker_invitation_id?: string | null
          voipzeker_login_token?: string | null
          voipzeker_outbound_number?: string | null
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
          voipzeker_invitation_id?: string | null
          voipzeker_login_token?: string | null
          voipzeker_outbound_number?: string | null
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
          auth_user_id: string | null
          avatar: string | null
          created_at: string
          device_id: string | null
          email: string
          id: string
          name: string
          organization_id: string | null
          role: string
          voipzeker_extension: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar?: string | null
          created_at?: string
          device_id?: string | null
          email: string
          id?: string
          name: string
          organization_id?: string | null
          role?: string
          voipzeker_extension?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar?: string | null
          created_at?: string
          device_id?: string | null
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          role?: string
          voipzeker_extension?: string | null
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
      public_ip_windows: {
        Row: {
          ip_hash: string
          requests: number
          window_start: string
        }
        Insert: {
          ip_hash: string
          requests?: number
          window_start?: string
        }
        Update: {
          ip_hash?: string
          requests?: number
          window_start?: string
        }
        Relationships: []
      }
      public_surveys: {
        Row: {
          answers: Json
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          id: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          profile_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          profile_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          profile_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      consume_public_request: { Args: { p_hash: string }; Returns: boolean }
      current_org_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      is_org_admin: { Args: never; Returns: boolean }
      safe_organizations: {
        Args: never
        Returns: {
          has_ghl_key: boolean
          id: string
          name: string
          voipzeker_connected: boolean
          voipzeker_outbound_number: string
        }[]
      }
      save_call_result: {
        Args: {
          p_callback?: Json
          p_company: string
          p_company_name: string
          p_contact: string
          p_contact_name: string
          p_duration: number
          p_notes: string
          p_phone: string
          p_request: string
          p_result: string
        }
        Returns: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
