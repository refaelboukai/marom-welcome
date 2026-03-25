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
      academic_assessments: {
        Row: {
          action_plan: Json | null
          ai_analysis: Json | null
          assessment_type: string
          created_at: string
          dimension_scores: Json | null
          grade_level: string
          id: string
          performance_level: string | null
          session_id: string
          status: string
          student_answers: Json | null
          subject: string
          test_content: Json | null
          updated_at: string
        }
        Insert: {
          action_plan?: Json | null
          ai_analysis?: Json | null
          assessment_type?: string
          created_at?: string
          dimension_scores?: Json | null
          grade_level: string
          id?: string
          performance_level?: string | null
          session_id: string
          status?: string
          student_answers?: Json | null
          subject: string
          test_content?: Json | null
          updated_at?: string
        }
        Update: {
          action_plan?: Json | null
          ai_analysis?: Json | null
          assessment_type?: string
          created_at?: string
          dimension_scores?: Json | null
          grade_level?: string
          id?: string
          performance_level?: string | null
          session_id?: string
          status?: string
          student_answers?: Json | null
          subject?: string
          test_content?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_assessments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_sessions: {
        Row: {
          academic_year: string
          admin_notes: string | null
          class_group: string | null
          closed_at: string | null
          consent_date: string | null
          consent_signature: string | null
          created_at: string
          grade: string | null
          id: string
          intake_date: string
          notes: string | null
          parent_code: string
          parent_name: string | null
          parent_open_response: string | null
          parent_phone: string | null
          parent_responses: Json
          reassessment_date: string | null
          reassessment_parent_responses: Json | null
          reassessment_status: string | null
          reassessment_student_responses: Json | null
          second_parent_name: string | null
          staff_code: string | null
          staff_open_responses: Json
          staff_responses: Json
          status: string
          student_code: string
          student_id_number: string | null
          student_name: string
          student_open_responses: Json
          student_responses: Json
          updated_at: string
        }
        Insert: {
          academic_year?: string
          admin_notes?: string | null
          class_group?: string | null
          closed_at?: string | null
          consent_date?: string | null
          consent_signature?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          intake_date?: string
          notes?: string | null
          parent_code: string
          parent_name?: string | null
          parent_open_response?: string | null
          parent_phone?: string | null
          parent_responses?: Json
          reassessment_date?: string | null
          reassessment_parent_responses?: Json | null
          reassessment_status?: string | null
          reassessment_student_responses?: Json | null
          second_parent_name?: string | null
          staff_code?: string | null
          staff_open_responses?: Json
          staff_responses?: Json
          status?: string
          student_code: string
          student_id_number?: string | null
          student_name: string
          student_open_responses?: Json
          student_responses?: Json
          updated_at?: string
        }
        Update: {
          academic_year?: string
          admin_notes?: string | null
          class_group?: string | null
          closed_at?: string | null
          consent_date?: string | null
          consent_signature?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          intake_date?: string
          notes?: string | null
          parent_code?: string
          parent_name?: string | null
          parent_open_response?: string | null
          parent_phone?: string | null
          parent_responses?: Json
          reassessment_date?: string | null
          reassessment_parent_responses?: Json | null
          reassessment_status?: string | null
          reassessment_student_responses?: Json | null
          second_parent_name?: string | null
          staff_code?: string | null
          staff_open_responses?: Json
          staff_responses?: Json
          status?: string
          student_code?: string
          student_id_number?: string | null
          student_name?: string
          student_open_responses?: Json
          student_responses?: Json
          updated_at?: string
        }
        Relationships: []
      }
      support_plans: {
        Row: {
          created_at: string
          description: string
          domain: string
          id: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          domain: string
          id?: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          domain?: string
          id?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_plans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
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
