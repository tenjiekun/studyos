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
      year_plans: {
        Row: { id: string; user_id: string; title: string; academic_year: string; start_date: string; end_date: string; daily_study_hours: number; weekly_study_days: number; buffer_pct: number; total_available_hours: number; total_planned_hours: number; status: string; locked: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title: string; academic_year?: string; start_date?: string; end_date?: string; daily_study_hours?: number; weekly_study_days?: number; buffer_pct?: number; total_available_hours?: number; total_planned_hours?: number; status?: string; locked?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; title?: string; academic_year?: string; start_date?: string; end_date?: string; daily_study_hours?: number; weekly_study_days?: number; buffer_pct?: number; total_available_hours?: number; total_planned_hours?: number; status?: string; locked?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      plan_goals: {
        Row: { id: string; user_id: string; plan_id: string | null; period: string; period_date: string | null; title: string; description: string | null; subject: string | null; target_date: string | null; priority: string; status: string; progress: number; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; plan_id?: string | null; period?: string; period_date?: string | null; title: string; description?: string | null; subject?: string | null; target_date?: string | null; priority?: string; status?: string; progress?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; plan_id?: string | null; period?: string; period_date?: string | null; title?: string; description?: string | null; subject?: string | null; target_date?: string | null; priority?: string; status?: string; progress?: number; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      syllabus_items: {
        Row: { id: string; user_id: string; subject: string; chapter: string; topic: string | null; subtopic: string | null; status: string; planned_date: string | null; completed_at: string | null; estimated_minutes: number; actual_minutes: number; revision_count: number; priority: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; subject: string; chapter: string; topic?: string | null; subtopic?: string | null; status?: string; planned_date?: string | null; completed_at?: string | null; estimated_minutes?: number; actual_minutes?: number; revision_count?: number; priority?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; subject?: string; chapter?: string; topic?: string | null; subtopic?: string | null; status?: string; planned_date?: string | null; completed_at?: string | null; estimated_minutes?: number; actual_minutes?: number; revision_count?: number; priority?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      scheduled_blocks: {
        Row: { id: string; user_id: string; type: string; title: string; subject: string | null; start_time: string; end_time: string; task_id: string | null; syllabus_item_id: string | null; test_id: string | null; status: string; actual_minutes: number | null; notes: string | null; google_event_id: string | null; recurrence: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; type?: string; title: string; subject?: string | null; start_time: string; end_time: string; task_id?: string | null; syllabus_item_id?: string | null; test_id?: string | null; status?: string; actual_minutes?: number | null; notes?: string | null; google_event_id?: string | null; recurrence?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; type?: string; title?: string; subject?: string | null; start_time?: string; end_time?: string; task_id?: string | null; syllabus_item_id?: string | null; test_id?: string | null; status?: string; actual_minutes?: number | null; notes?: string | null; google_event_id?: string | null; recurrence?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      tests: {
        Row: { id: string; user_id: string; name: string; type: string; category: string; date: string; start_time: string | null; duration_minutes: number; subjects: string[]; syllabus_covered: string | null; max_marks: number; target_marks: number | null; actual_marks: number | null; percentage: number | null; rank: number | null; accuracy: number | null; questions_attempted: number | null; correct_answers: number | null; incorrect_answers: number | null; unattempted: number | null; time_taken_minutes: number | null; notes: string | null; google_event_id: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; type?: string; category?: string; date: string; start_time?: string | null; duration_minutes?: number; subjects?: string[]; syllabus_covered?: string | null; max_marks?: number; target_marks?: number | null; actual_marks?: number | null; percentage?: number | null; rank?: number | null; accuracy?: number | null; questions_attempted?: number | null; correct_answers?: number | null; incorrect_answers?: number | null; unattempted?: number | null; time_taken_minutes?: number | null; notes?: string | null; google_event_id?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; name?: string; type?: string; category?: string; date?: string; start_time?: string | null; duration_minutes?: number; subjects?: string[]; syllabus_covered?: string | null; max_marks?: number; target_marks?: number | null; actual_marks?: number | null; percentage?: number | null; rank?: number | null; accuracy?: number | null; questions_attempted?: number | null; correct_answers?: number | null; incorrect_answers?: number | null; unattempted?: number | null; time_taken_minutes?: number | null; notes?: string | null; google_event_id?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      test_subject_results: {
        Row: { id: string; test_id: string; subject: string; marks: number | null; max_marks: number | null; accuracy: number | null; questions_attempted: number | null; correct_answers: number | null; created_at: string };
        Insert: { id?: string; test_id: string; subject: string; marks?: number | null; max_marks?: number | null; accuracy?: number | null; questions_attempted?: number | null; correct_answers?: number | null; created_at?: string };
        Update: { id?: string; test_id?: string; subject?: string; marks?: number | null; max_marks?: number | null; accuracy?: number | null; questions_attempted?: number | null; correct_answers?: number | null; created_at?: string };
        Relationships: [];
      };
      free_time_logs: {
        Row: { id: string; user_id: string; date: string; category: string; start_time: string | null; end_time: string | null; duration_minutes: number; notes: string | null; created_at: string };
        Insert: { id?: string; user_id: string; date: string; category?: string; start_time?: string | null; end_time?: string | null; duration_minutes?: number; notes?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; date?: string; category?: string; start_time?: string | null; end_time?: string | null; duration_minutes?: number; notes?: string | null; created_at?: string };
        Relationships: [];
      };
      daily_schedules: {
        Row: { id: string; user_id: string; day_of_week: number | null; wake_time: string | null; sleep_time: string | null; school_start: string | null; school_end: string | null; coaching_start: string | null; coaching_end: string | null; max_study_hours: number; notes: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; day_of_week?: number | null; wake_time?: string | null; sleep_time?: string | null; school_start?: string | null; school_end?: string | null; coaching_start?: string | null; coaching_end?: string | null; max_study_hours?: number; notes?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; day_of_week?: number | null; wake_time?: string | null; sleep_time?: string | null; school_start?: string | null; school_end?: string | null; coaching_start?: string | null; coaching_end?: string | null; max_study_hours?: number; notes?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      google_calendar_connections: {
        Row: { id: string; user_id: string; google_account_email: string | null; sync_enabled: boolean; sync_study_events: boolean; sync_test_events: boolean; last_synced_at: string | null; access_token_encrypted: string | null; refresh_token_encrypted: string | null; token_expires_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; google_account_email?: string | null; sync_enabled?: boolean; sync_study_events?: boolean; sync_test_events?: boolean; last_synced_at?: string | null; access_token_encrypted?: string | null; refresh_token_encrypted?: string | null; token_expires_at?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; google_account_email?: string | null; sync_enabled?: boolean; sync_study_events?: boolean; sync_test_events?: boolean; last_synced_at?: string | null; access_token_encrypted?: string | null; refresh_token_encrypted?: string | null; token_expires_at?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      calendar_event_mappings: {
        Row: { id: string; user_id: string; local_record_id: string; local_record_type: string; google_calendar_id: string | null; google_event_id: string; last_synced_at: string; sync_status: string; sync_direction: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; local_record_id: string; local_record_type: string; google_calendar_id?: string | null; google_event_id: string; last_synced_at?: string; sync_status?: string; sync_direction?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; local_record_id?: string; local_record_type?: string; google_calendar_id?: string | null; google_event_id?: string; last_synced_at?: string; sync_status?: string; sync_direction?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      monthly_plans: {
        Row: { id: string; user_id: string; year: string | null; month: string; planned_study_hours: number; planned_tasks: number; planned_chapters: number; planned_mocks: number; planned_revisions: number; notes: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; year?: string | null; month: string; planned_study_hours?: number; planned_tasks?: number; planned_chapters?: number; planned_mocks?: number; planned_revisions?: number; notes?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; year?: string | null; month?: string; planned_study_hours?: number; planned_tasks?: number; planned_chapters?: number; planned_mocks?: number; planned_revisions?: number; notes?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      subjects: {
        Row: { id: string; user_id: string; name: string; color: string; priority: string; target_completion_date: string | null; weekly_target_hours: number; allocation_pct: number; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; color?: string; priority?: string; target_completion_date?: string | null; weekly_target_hours?: number; allocation_pct?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; name?: string; color?: string; priority?: string; target_completion_date?: string | null; weekly_target_hours?: number; allocation_pct?: number; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      syllabus_chapters: {
        Row: { id: string; user_id: string; subject_id: string; name: string; topics: string[] | null; status: string; priority: string; estimated_hours: number; actual_hours: number; target_date: string | null; completed_at: string | null; revision_count: number; sort_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; subject_id: string; name: string; topics?: string[] | null; status?: string; priority?: string; estimated_hours?: number; actual_hours?: number; target_date?: string | null; completed_at?: string | null; revision_count?: number; sort_order?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; subject_id?: string; name?: string; topics?: string[] | null; status?: string; priority?: string; estimated_hours?: number; actual_hours?: number; target_date?: string | null; completed_at?: string | null; revision_count?: number; sort_order?: number; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "syllabus_chapters_subject_id_fkey"; columns: ["subject_id"]; isOneToOne: false; referencedRelation: "subjects"; referencedColumns: ["id"] }];
      };
      plan_distributions: {
        Row: { id: string; user_id: string; year_plan_id: string; subject_id: string; month: string; planned_hours: number; planned_chapters: number; actual_hours: number; actual_chapters: number; locked: boolean; created_at: string };
        Insert: { id?: string; user_id: string; year_plan_id: string; subject_id: string; month: string; planned_hours?: number; planned_chapters?: number; actual_hours?: number; actual_chapters?: number; locked?: boolean; created_at?: string };
        Update: { id?: string; user_id?: string; year_plan_id?: string; subject_id?: string; month?: string; planned_hours?: number; planned_chapters?: number; actual_hours?: number; actual_chapters?: number; locked?: boolean; created_at?: string };
        Relationships: [];
      };
      chapter_assignments: {
        Row: { id: string; user_id: string; chapter_id: string; year_plan_id: string | null; assigned_month: string | null; assigned_week: string | null; assigned_date: string | null; estimated_start: string | null; estimated_end: string | null; locked: boolean; sort_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; chapter_id: string; year_plan_id?: string | null; assigned_month?: string | null; assigned_week?: string | null; assigned_date?: string | null; estimated_start?: string | null; estimated_end?: string | null; locked?: boolean; sort_order?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; chapter_id?: string; year_plan_id?: string | null; assigned_month?: string | null; assigned_week?: string | null; assigned_date?: string | null; estimated_start?: string | null; estimated_end?: string | null; locked?: boolean; sort_order?: number; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      weekly_plans: {
        Row: { id: string; user_id: string; year_plan_id: string | null; week_start: string; week_end: string; planned_hours: number; actual_hours: number; planned_chapters: number; actual_chapters: number; status: string; locked: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; year_plan_id?: string | null; week_start: string; week_end: string; planned_hours?: number; actual_hours?: number; planned_chapters?: number; actual_chapters?: number; status?: string; locked?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; year_plan_id?: string | null; week_start?: string; week_end?: string; planned_hours?: number; actual_hours?: number; planned_chapters?: number; actual_chapters?: number; status?: string; locked?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      daily_plans: {
        Row: { id: string; user_id: string; date: string; planned_hours: number; actual_hours: number; focus_minutes: number; productivity_score: number; status: string; locked: boolean; notes: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; date: string; planned_hours?: number; actual_hours?: number; focus_minutes?: number; productivity_score?: number; status?: string; locked?: boolean; notes?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; date?: string; planned_hours?: number; actual_hours?: number; focus_minutes?: number; productivity_score?: number; status?: string; locked?: boolean; notes?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      daily_plan_blocks: {
        Row: { id: string; user_id: string; daily_plan_id: string | null; chapter_id: string | null; subject_id: string | null; title: string; start_time: string; end_time: string; type: string; completed: boolean; actual_minutes: number | null; locked: boolean; sort_order: number; created_at: string };
        Insert: { id?: string; user_id: string; daily_plan_id?: string | null; chapter_id?: string | null; subject_id?: string | null; title: string; start_time: string; end_time: string; type?: string; completed?: boolean; actual_minutes?: number | null; locked?: boolean; sort_order?: number; created_at?: string };
        Update: { id?: string; user_id?: string; daily_plan_id?: string | null; chapter_id?: string | null; subject_id?: string | null; title?: string; start_time?: string; end_time?: string; type?: string; completed?: boolean; actual_minutes?: number | null; locked?: boolean; sort_order?: number; created_at?: string };
        Relationships: [];
      };
      replan_logs: {
        Row: { id: string; user_id: string; year_plan_id: string | null; reason: string | null; chapters_behind: number; hours_behind: number; changes_made: any; created_at: string };
        Insert: { id?: string; user_id: string; year_plan_id?: string | null; reason?: string | null; chapters_behind?: number; hours_behind?: number; changes_made?: any; created_at?: string };
        Update: { id?: string; user_id?: string; year_plan_id?: string | null; reason?: string | null; chapters_behind?: number; hours_behind?: number; changes_made?: any; created_at?: string };
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
