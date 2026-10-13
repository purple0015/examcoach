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

export type GenerationMode = "replace" | "append";

export interface GeneratedAnalysisSummary {
  topics: string[];
  summary: string;
  documentId?: string;
  analyzedAt?: string;
}

export interface TierLimits {
  dailyUploads: number;
  maxFileSizeMb: number;
  mockExamQuestions: number;
  flashcardsPerBatch: number;
  aiRequestsPerDay: number;
  groqTokenLimit: number;
  hasPriorityInference: boolean;
}
