export type SubscriptionTier =
  | "free_trial"
  | "starter_free"
  | "pro_scholar"
  | "global_elite"
  | "school"
  | "ministry"
  | "ngo";

export type Locale = "en" | "nd" | "sn" | "fr" | "es" | "pt" | "ar" | "zh" | "sw";

export type ThemePreference = "light" | "dark" | "system";

export interface TierLimits {
  dailyUploads: number;
  maxFileSizeMb: number;
  mockExamQuestions: number;
  flashcardsPerBatch: number;
  aiRequestsPerDay: number;
  groqTokenLimit: number;
  hasPriorityInference: boolean;
}

export interface Plan {
  id: SubscriptionTier;
  name: string;
  price: number;
  interval: "month" | "trial";
  maxSeats: number;
  limits: TierLimits;
  studyMethods: StudyMethodId[];
  dashboard: DashboardVariant;
  highlights: string[];
}

export type DashboardVariant =
  | "trial"
  | "starter"
  | "individual"
  | "family"
  | "school"
  | "ministry"
  | "ngo";

export type StudyMethodId =
  | "flashcards"
  | "active_recall"
  | "pomodoro"
  | "feynman"
  | "spaced_repetition"
  | "mock_exam"
  | "cornell_notes"
  | "blurting"
  | "mind_map"
  | "interleaving"
  | "past_paper_drill"
  | "exam_blueprint"
  | "peer_teaching"
  | "cohort_analytics";

export interface StudyMethod {
  id: StudyMethodId;
  href: string;
  icon: string;
  minutes: number;
  intensity: "light" | "moderate" | "deep";
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  status: string;
  isTrial: boolean;
  trialDaysLeft: number;
  currentPeriodEnd: string | null;
  seats: number;
  maxSeats: number;
  limits: TierLimits;
  studyMethods: StudyMethodId[];
  dashboard: DashboardVariant;
}

export interface UploadQuota {
  canUpload: boolean;
  uploadsToday: number;
  maxUploads: number;
  uploadsRemaining: number;
  maxFileSizeMb: number;
  tier: SubscriptionTier;
}

export interface WeaknessCell {
  topic: string;
  strength: number;
  color: "mint" | "amber" | "red";
  questionsAttempted: number;
  questionsCorrect: number;
}

export interface DailyActivity {
  date: string;
  minutes: number;
  goalMet: boolean;
}

export interface DashboardStats {
  streak: number;
  longestStreak: number;
  minutesToday: number;
  dailyGoal: number;
  dailyGoalPct: number;
  minutesThisWeek: number;
  topicsThisWeek: number;
  weeklyGoal: number;
  weeklyGoalPct: number;
  flashcardCount: number;
  docCount: number;
  mockExamCount: number;
  topicsMastered: number;
  averageScore: number;
  weaknessMatrix: WeaknessCell[];
  last14Days: DailyActivity[];
  studiedToday: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  planBreakdown: Record<string, number>;
  totalDocuments: number;
  totalFlashcards: number;
  totalMockExams: number;
  recentSignups: { id: string; name: string | null; email: string; createdAt: string }[];
}

export interface DocumentSummary {
  id: string;
  filename: string;
  topics: string[];
  createdAt: string;
}

export interface FlashcardItem {
  id: string;
  topic: string;
  question: string;
  answer: string;
  confidence: string | null;
  lastReviewed: string | null;
  nextReview: string | null;
}

export interface MockExamQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}
