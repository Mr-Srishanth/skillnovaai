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
      analysis_history: {
        Row: {
          created_at: string
          id: string
          missing_skills: Json
          recommended_learning: Json
          roadmap: Json
          skill_score: number | null
          skills: string
          target_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          missing_skills?: Json
          recommended_learning?: Json
          roadmap?: Json
          skill_score?: number | null
          skills: string
          target_role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          missing_skills?: Json
          recommended_learning?: Json
          roadmap?: Json
          skill_score?: number | null
          skills?: string
          target_role?: string
          user_id?: string
        }
        Relationships: []
      }
      career_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          meta: Json
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label: string
          meta?: Json
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          meta?: Json
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      career_jobs: {
        Row: {
          analysis: Json
          applied_at: string | null
          company: string | null
          created_at: string
          description: string | null
          id: string
          job_readiness: number | null
          match_score: number | null
          requirements: Json
          source_url: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json
          applied_at?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_readiness?: number | null
          match_score?: number | null
          requirements?: Json
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json
          applied_at?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_readiness?: number | null
          match_score?: number | null
          requirements?: Json
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_simulations: {
        Row: {
          base_role: string | null
          created_at: string
          id: string
          result: Json
          roles: Json
          scenario: string | null
          user_id: string
        }
        Insert: {
          base_role?: string | null
          created_at?: string
          id?: string
          result?: Json
          roles?: Json
          scenario?: string | null
          user_id: string
        }
        Update: {
          base_role?: string | null
          created_at?: string
          id?: string
          result?: Json
          roles?: Json
          scenario?: string | null
          user_id?: string
        }
        Relationships: []
      }
      execution_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          effort_minutes: number
          horizon: string
          id: string
          meta: Json
          source: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          user_id: string
          why: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          effort_minutes?: number
          horizon?: string
          id?: string
          meta?: Json
          source?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          user_id: string
          why?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          effort_minutes?: number
          horizon?: string
          id?: string
          meta?: Json
          source?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          why?: string | null
        }
        Relationships: []
      }
      gamification: {
        Row: {
          badges: Json
          created_at: string
          id: string
          last_active: string | null
          level: string
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          badges?: Json
          created_at?: string
          id?: string
          last_active?: string | null
          level?: string
          streak_days?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          badges?: Json
          created_at?: string
          id?: string
          last_active?: string | null
          level?: string
          streak_days?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      knowledge_items: {
        Row: {
          created_at: string
          id: string
          mastered: boolean
          note_style: string
          notebook: Json | null
          notebook_style: Json | null
          output: Json
          quiz_score: number | null
          reading_minutes: number | null
          search_text: string | null
          source_ref: string | null
          source_type: string
          title: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mastered?: boolean
          note_style?: string
          notebook?: Json | null
          notebook_style?: Json | null
          output?: Json
          quiz_score?: number | null
          reading_minutes?: number | null
          search_text?: string | null
          source_ref?: string | null
          source_type?: string
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mastered?: boolean
          note_style?: string
          notebook?: Json | null
          notebook_style?: Json | null
          output?: Json
          quiz_score?: number | null
          reading_minutes?: number | null
          search_text?: string | null
          source_ref?: string | null
          source_type?: string
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          created_at: string
          eligibility: string | null
          id: string
          kind: string
          link: string | null
          match_reason: string | null
          match_score: number | null
          missing_skills: Json
          organization: string | null
          preparation: Json
          required_skills: Json
          saved: boolean
          timing: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eligibility?: string | null
          id?: string
          kind?: string
          link?: string | null
          match_reason?: string | null
          match_score?: number | null
          missing_skills?: Json
          organization?: string | null
          preparation?: Json
          required_skills?: Json
          saved?: boolean
          timing?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          eligibility?: string | null
          id?: string
          kind?: string
          link?: string | null
          match_reason?: string | null
          match_score?: number | null
          missing_skills?: Json
          organization?: string | null
          preparation?: Json
          required_skills?: Json
          saved?: boolean
          timing?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      skill_verifications: {
        Row: {
          answers: Json
          assessment: Json
          claimed_level: string | null
          created_at: string
          id: string
          result: Json
          score: number | null
          skill: string
          status: string
          updated_at: string
          user_id: string
          verified_level: string | null
        }
        Insert: {
          answers?: Json
          assessment?: Json
          claimed_level?: string | null
          created_at?: string
          id?: string
          result?: Json
          score?: number | null
          skill: string
          status?: string
          updated_at?: string
          user_id: string
          verified_level?: string | null
        }
        Update: {
          answers?: Json
          assessment?: Json
          claimed_level?: string | null
          created_at?: string
          id?: string
          result?: Json
          score?: number | null
          skill?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_level?: string | null
        }
        Relationships: []
      }
      studio_projects: {
        Row: {
          blueprint: Json
          career_relevance: string | null
          completed_tasks: Json
          created_at: string
          difficulty: string
          duration: string | null
          extra_tasks: Json
          goal: string | null
          id: string
          interview_questions: Json | null
          milestones: Json
          notes: string | null
          prerequisites: Json
          project_type: string | null
          quality: Json
          resume_entry: Json | null
          resume_value: string | null
          skills_addressed: Json
          skills_developed: Json
          source_mode: string
          status: string
          summary: string | null
          tech_stack: Json
          title: string
          updated_at: string
          user_id: string
          why: string | null
        }
        Insert: {
          blueprint?: Json
          career_relevance?: string | null
          completed_tasks?: Json
          created_at?: string
          difficulty?: string
          duration?: string | null
          extra_tasks?: Json
          goal?: string | null
          id?: string
          interview_questions?: Json | null
          milestones?: Json
          notes?: string | null
          prerequisites?: Json
          project_type?: string | null
          quality?: Json
          resume_entry?: Json | null
          resume_value?: string | null
          skills_addressed?: Json
          skills_developed?: Json
          source_mode?: string
          status?: string
          summary?: string | null
          tech_stack?: Json
          title: string
          updated_at?: string
          user_id: string
          why?: string | null
        }
        Update: {
          blueprint?: Json
          career_relevance?: string | null
          completed_tasks?: Json
          created_at?: string
          difficulty?: string
          duration?: string | null
          extra_tasks?: Json
          goal?: string | null
          id?: string
          interview_questions?: Json | null
          milestones?: Json
          notes?: string | null
          prerequisites?: Json
          project_type?: string | null
          quality?: Json
          resume_entry?: Json | null
          resume_value?: string | null
          skills_addressed?: Json
          skills_developed?: Json
          source_mode?: string
          status?: string
          summary?: string | null
          tech_stack?: Json
          title?: string
          updated_at?: string
          user_id?: string
          why?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: { Args: { _amount: number; _user_id: string }; Returns: Json }
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
