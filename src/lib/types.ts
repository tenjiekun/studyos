export interface Task {
  id: string;
  title: string;
  subject: string;
  description?: string;
  priority: "low" | "medium" | "high";
  estimated_minutes: number;
  scheduled_date: string; // YYYY-MM-DD
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  task_id?: string;
  subject?: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  session_type: "focus" | "pomodoro";
}

export interface PomodoroSettings {
  focus_duration: number;
  short_break_duration: number;
  long_break_duration: number;
  sessions_before_long_break: number;
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  daily_goal_minutes: number;
  pomodoro: PomodoroSettings;
}

export const DEFAULT_POMODORO: PomodoroSettings = {
  focus_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  sessions_before_long_break: 4,
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  daily_goal_minutes: 360, // 6 hours
  pomodoro: DEFAULT_POMODORO,
};

export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Computer Science",
  "History",
  "Other",
];

// ===== Community Types =====

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  username: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  category: string;
  privacy: "public" | "private";
  created_by: string | null;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
}

export interface GroupWithMembers extends Group {
  member_count?: number;
  last_message?: Message | null;
  unread_count?: number;
  is_member?: boolean;
  my_role?: "admin" | "member" | null;
  members?: GroupMember[];
  profiles?: Profile;
}

export interface Message {
  id: string;
  group_id: string;
  user_id: string;
  message_type: "text" | "image" | "audio";
  text: string | null;
  media_url: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
}

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: "text" | "image" | "audio";
  text: string | null;
  media_url: string | null;
  created_at: string;
  profiles?: Profile;
}

export const GROUP_CATEGORIES = [
  "General",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Engineering",
  "Medical",
  "Languages",
  "Exam Prep",
  "College",
  "Other",
];

// ===== Local Community Storage (Bypass Mode) =====

export interface LocalCommunityData {
  groups: GroupWithMembers[];
  messages: Record<string, Message[]>;
}
