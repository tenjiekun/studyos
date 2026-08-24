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
          username: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          avatar_url?: string | null;
          username?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string | null;
          username?: string | null;
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
      conversations: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      dm_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          message_type: "text" | "image" | "audio";
          text: string | null;
          media_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          message_type?: "text" | "image" | "audio";
          text?: string | null;
          media_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          message_type?: "text" | "image" | "audio";
          text?: string | null;
          media_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      dm_message_reads: {
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
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          group_id: string | null;
          sender_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          group_id?: string | null;
          sender_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          group_id?: string | null;
          sender_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      call_logs: {
        Row: {
          id: string;
          conversation_id: string;
          caller_id: string;
          receiver_id: string;
          call_type: string;
          status: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          caller_id: string;
          receiver_id: string;
          call_type?: string;
          status?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          caller_id?: string;
          receiver_id?: string;
          call_type?: string;
          status?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_signals: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          signal_type: string;
          call_type: string | null;
          sender_name: string | null;
          signal_data: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          signal_type: string;
          call_type?: string | null;
          sender_name?: string | null;
          signal_data?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          signal_type?: string;
          call_type?: string | null;
          sender_name?: string | null;
          signal_data?: any;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      create_task: {
        Args: { p_title: string; p_subject: string; p_description: string | null; p_priority: string; p_estimated_minutes: number; p_scheduled_date: string; p_completed: boolean };
        Returns: any;
      };
      update_task: {
        Args: { p_id: string; p_title?: string | null; p_subject?: string | null; p_description?: string | null; p_priority?: string | null; p_estimated_minutes?: number | null; p_scheduled_date?: string | null; p_completed?: boolean | null; p_completed_at?: string | null };
        Returns: void;
      };
      delete_task: {
        Args: { p_id: string };
        Returns: void;
      };
      toggle_task: {
        Args: { p_id: string };
        Returns: void;
      };
      create_session: {
        Args: { p_task_id: string | null; p_subject: string | null; p_start_time: string; p_end_time: string | null; p_duration_minutes: number; p_session_type: string };
        Returns: any;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
}
