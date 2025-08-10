export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  bachelor_baseplant_jacob_flender: {
    Tables: {
      distance_pairs: {
        Row: {
          distance: number | null
          floor: number
          from_id: string
          from_label: string | null
          id: number
          to_id: string
          to_label: string | null
        }
        Insert: {
          distance?: number | null
          floor: number
          from_id: string
          from_label?: string | null
          id?: number
          to_id: string
          to_label?: string | null
        }
        Update: {
          distance?: number | null
          floor?: number
          from_id?: string
          from_label?: string | null
          id?: number
          to_id?: string
          to_label?: string | null
        }
        Relationships: []
      }
      employee: {
        Row: {
          id: number
          mail: string | null
          real_name: string
          slack_id: string | null
        }
        Insert: {
          id?: number
          mail?: string | null
          real_name: string
          slack_id?: string | null
        }
        Update: {
          id?: number
          mail?: string | null
          real_name?: string
          slack_id?: string | null
        }
        Relationships: []
      }
      location: {
        Row: {
          deskly_id: string
          floor: number | null
          id: number
          name: string
          x_value: number | null
          y_value: number | null
        }
        Insert: {
          deskly_id: string
          floor?: number | null
          id?: number
          name: string
          x_value?: number | null
          y_value?: number | null
        }
        Update: {
          deskly_id?: string
          floor?: number | null
          id?: number
          name?: string
          x_value?: number | null
          y_value?: number | null
        }
        Relationships: []
      }
      plant: {
        Row: {
          care_id: number
          id: number
          image_url: string | null
          location_id: number
          name: string | null
          size: string | null
        }
        Insert: {
          care_id: number
          id?: number
          image_url?: string | null
          location_id: number
          name?: string | null
          size?: string | null
        }
        Update: {
          care_id?: number
          id?: number
          image_url?: string | null
          location_id?: number
          name?: string | null
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_care_id_fkey"
            columns: ["care_id"]
            isOneToOne: false
            referencedRelation: "plant_care"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "watering_task_view"
            referencedColumns: ["location_id"]
          },
        ]
      }
      plant_care: {
        Row: {
          id: number
          interval: number
          method: string
          name: string
          volume: number
        }
        Insert: {
          id?: number
          interval: number
          method: string
          name: string
          volume: number
        }
        Update: {
          id?: number
          interval?: number
          method?: string
          name?: string
          volume?: number
        }
        Relationships: []
      }
      plant_schedule: {
        Row: {
          id: number
          last_watered: string | null
          next_watering: string | null
          plant_id: number
        }
        Insert: {
          id?: number
          last_watered?: string | null
          next_watering?: string | null
          plant_id: number
        }
        Update: {
          id?: number
          last_watered?: string | null
          next_watering?: string | null
          plant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "plant_schedule_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plant"
            referencedColumns: ["id"]
          },
        ]
      }
      user_id_mapping: {
        Row: {
          created_at: string | null
          deskly_id: string
          internal_id: number
        }
        Insert: {
          created_at?: string | null
          deskly_id: string
          internal_id?: number
        }
        Update: {
          created_at?: string | null
          deskly_id?: string
          internal_id?: number
        }
        Relationships: []
      }
      watering_task: {
        Row: {
          assigned_user_id: number | null
          candidate_user_ids: Json | null
          created_at: string
          id: number
          notified_at: string | null
          plant_id: number
          reminder_at: string | null
          status: string
        }
        Insert: {
          assigned_user_id?: number | null
          candidate_user_ids?: Json | null
          created_at: string
          id?: number
          notified_at?: string | null
          plant_id: number
          reminder_at?: string | null
          status: string
        }
        Update: {
          assigned_user_id?: number | null
          candidate_user_ids?: Json | null
          created_at?: string
          id?: number
          notified_at?: string | null
          plant_id?: number
          reminder_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "watering_task_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watering_task_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plant"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      watering_task_view: {
        Row: {
          assigned_user_id: number | null
          deskly_id: string | null
          floor: number | null
          id: number | null
          image_url: string | null
          interval: number | null
          location_id: number | null
          location_name: string | null
          method: string | null
          next_watering: string | null
          notified_at: string | null
          plant_id: number | null
          plant_name: string | null
          reminder_at: string | null
          status: string | null
          volume: number | null
        }
        Relationships: [
          {
            foreignKeyName: "watering_task_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watering_task_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plant"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      createfastlookupview: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
  bachelor_baseplant_jacob_flender: {
    Enums: {},
  },
} as const
