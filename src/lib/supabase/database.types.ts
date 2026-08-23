export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          subject: string;
          description: string | null;
          priority: "low" | "medium" | "high";
          estimated_minutes: number;
          scheduled_date: string;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          subject: string;
          description?: string | null;
          priority: "low" | "medium" | "high";
          estimated_minutes: number;
          scheduled_date: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          subject?: string;
          description?: string | null;
          priority?: "low" | "medium" | "high";
          estimated_minutes?: number;
          scheduled_date?: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          subject: string | null;
          start_time: string;
          end_time: string | null;
          duration_minutes: number;
          session_type: "focus" | "pomodoro";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          subject?: string | null;
          start_time: string;
          end_time?: string | null;
          duration_minutes: number;
          session_type: "focus" | "pomodoro";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          subject?: string | null;
          start_time?: string;
          end_time?: string | null;
          duration_minutes?: number;
          session_type?: "focus" | "pomodoro";
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          theme: "light" | "dark" | "system";
          daily_goal_minutes: number;
          pomodoro_focus_duration: number;
          pomodoro_short_break: number;
          pomodoro_long_break: number;
          pomodoro_sessions_before_long: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: "light" | "dark" | "system";
          daily_goal_minutes?: number;
          pomodoro_focus_duration?: number;
          pomodoro_short_break?: number;
          pomodoro_long_break?: number;
          pomodoro_sessions_before_long?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: "light" | "dark" | "system";
          daily_goal_minutes?: number;
          pomodoro_focus_duration?: number;
          pomodoro_short_break?: number;
          pomodoro_long_break?: number;
          pomodoro_sessions_before_long?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string;
          image_url: string | null;
          category: string;
          privacy: "public" | "private";
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          image_url?: string | null;
          category?: string;
          privacy?: "public" | "private";
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          image_url?: string | null;
          category?: string;
          privacy?: "public" | "private";
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: "admin" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: "admin" | "member";
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: "admin" | "member";
          joined_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          message_type: "text" | "image" | "audio";
          text: string | null;
          media_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          message_type?: "text" | "image" | "audio";
          text?: string | null;
          media_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          message_type?: "text" | "image" | "audio";
          text?: string | null;
          media_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      message_reads: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          read_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
