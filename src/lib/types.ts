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

export interface CallLog {
  id: string;
  conversation_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "audio" | "video";
  status: "completed" | "missed" | "declined";
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  caller?: Profile;
  receiver?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "message" | "group_join" | "group_invite" | "system";
  title: string;
  body: string;
  group_id?: string;
  sender_id?: string;
  read: boolean;
  created_at: string;
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

// ===== Planner Types =====

export interface YearPlan {
  id: string;
  user_id: string;
  title: string;
  academic_year: string;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface PlanGoal {
  id: string;
  user_id: string;
  plan_id: string | null;
  period: "year" | "month" | "week";
  period_date: string | null;
  title: string;
  description: string | null;
  subject: string | null;
  target_date: string | null;
  priority: "low" | "medium" | "high";
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface SyllabusItem {
  id: string;
  user_id: string;
  subject: string;
  chapter: string;
  topic: string | null;
  subtopic: string | null;
  status: "not_started" | "in_progress" | "completed" | "revising" | "needs_revision";
  planned_date: string | null;
  completed_at: string | null;
  estimated_minutes: number;
  actual_minutes: number;
  revision_count: number;
  priority: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
}

export interface ScheduledBlock {
  id: string;
  user_id: string;
  type: "study" | "school" | "test" | "mock_test" | "revision" | "personal" | "break" | "free" | "other";
  title: string;
  subject: string | null;
  start_time: string;
  end_time: string;
  task_id: string | null;
  syllabus_item_id: string | null;
  test_id: string | null;
  status: "planned" | "in_progress" | "completed" | "skipped" | "cancelled";
  actual_minutes: number | null;
  notes: string | null;
  google_event_id: string | null;
  recurrence: string | null;
  created_at: string;
  updated_at: string;
}

export interface Test {
  id: string;
  user_id: string;
  name: string;
  type: "actual" | "mock" | "practice" | "competitive";
  category: "school" | "coaching" | "self" | "competitive" | "other";
  date: string;
  start_time: string | null;
  duration_minutes: number;
  subjects: string[];
  syllabus_covered: string | null;
  max_marks: number;
  target_marks: number | null;
  actual_marks: number | null;
  percentage: number | null;
  rank: number | null;
  accuracy: number | null;
  questions_attempted: number | null;
  correct_answers: number | null;
  incorrect_answers: number | null;
  unattempted: number | null;
  time_taken_minutes: number | null;
  notes: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestSubjectResult {
  id: string;
  test_id: string;
  subject: string;
  marks: number | null;
  max_marks: number | null;
  accuracy: number | null;
  questions_attempted: number | null;
  correct_answers: number | null;
  created_at: string;
}

export interface FreeTimeLog {
  id: string;
  user_id: string;
  date: string;
  category: "entertainment" | "social" | "hobbies" | "exercise" | "rest" | "gaming" | "reading" | "travel" | "other";
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
}

export interface DailySchedule {
  id: string;
  user_id: string;
  day_of_week: number | null;
  wake_time: string | null;
  sleep_time: string | null;
  school_start: string | null;
  school_end: string | null;
  coaching_start: string | null;
  coaching_end: string | null;
  max_study_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarConnection {
  id: string;
  user_id: string;
  google_account_email: string | null;
  sync_enabled: boolean;
  sync_study_events: boolean;
  sync_test_events: boolean;
  last_synced_at: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventMapping {
  id: string;
  user_id: string;
  local_record_id: string;
  local_record_type: "scheduled_block" | "test" | "task";
  google_calendar_id: string | null;
  google_event_id: string;
  last_synced_at: string;
  sync_status: "synced" | "pending" | "error";
  sync_direction: "app_to_google" | "google_to_app";
  created_at: string;
  updated_at: string;
}

export interface MonthlyPlan {
  id: string;
  user_id: string;
  year: string | null;
  month: string;
  planned_study_hours: number;
  planned_tasks: number;
  planned_chapters: number;
  planned_mocks: number;
  planned_revisions: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const TEST_TYPES = [
  { value: "actual", label: "Actual Test" },
  { value: "mock", label: "Mock Test" },
  { value: "practice", label: "Practice" },
  { value: "competitive", label: "Competitive" },
] as const;

export const TEST_CATEGORIES = [
  { value: "school", label: "School" },
  { value: "coaching", label: "Coaching" },
  { value: "self", label: "Self" },
  { value: "competitive", label: "Competitive" },
  { value: "other", label: "Other" },
] as const;

export const BLOCK_TYPES = [
  { value: "study", label: "Study", color: "#6366F1" },
  { value: "school", label: "School", color: "#F59E0B" },
  { value: "test", label: "Test", color: "#EF4444" },
  { value: "mock_test", label: "Mock Test", color: "#EC4899" },
  { value: "revision", label: "Revision", color: "#8B5CF6" },
  { value: "personal", label: "Personal", color: "#06B6D4" },
  { value: "break", label: "Break", color: "#10B981" },
  { value: "free", label: "Free", color: "#6B7280" },
  { value: "other", label: "Other", color: "#9CA3AF" },
] as const;

export const FREE_TIME_CATEGORIES = [
  { value: "entertainment", label: "Entertainment" },
  { value: "social", label: "Friends / Social" },
  { value: "hobbies", label: "Hobbies" },
  { value: "exercise", label: "Exercise" },
  { value: "rest", label: "Rest" },
  { value: "gaming", label: "Gaming" },
  { value: "reading", label: "Reading" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
] as const;
