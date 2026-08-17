import { StudyMethod, StudyMethodId, SubscriptionTier } from "@/types";
import { getPlanByTier, PLANS } from "@/lib/plans";

export const STUDY_METHODS: StudyMethod[] = [
  { id: "flashcards", href: "/study/flashcards", icon: "Layers", minutes: 15, intensity: "light" },
  { id: "active_recall", href: "/study/active-recall", icon: "Brain", minutes: 20, intensity: "moderate" },
  { id: "pomodoro", href: "/study/pomodoro", icon: "Timer", minutes: 25, intensity: "light" },
  { id: "feynman", href: "/study/feynman", icon: "MessageSquare", minutes: 20, intensity: "deep" },
  { id: "spaced_repetition", href: "/study/spaced-repetition", icon: "Repeat", minutes: 15, intensity: "moderate" },
  { id: "mock_exam", href: "/study/mock-exam", icon: "ClipboardList", minutes: 45, intensity: "deep" },
  { id: "cornell_notes", href: "/study/cornell-notes", icon: "NotebookPen", minutes: 30, intensity: "moderate" },
  { id: "blurting", href: "/study/blurting", icon: "PenLine", minutes: 15, intensity: "moderate" },
  { id: "mind_map", href: "/study/mind-map", icon: "Network", minutes: 25, intensity: "moderate" },
  { id: "interleaving", href: "/study/interleaving", icon: "Shuffle", minutes: 30, intensity: "deep" },
  { id: "past_paper_drill", href: "/study/past-paper-drill", icon: "FileSearch", minutes: 40, intensity: "deep" },
  { id: "exam_blueprint", href: "/study/exam-blueprint", icon: "Map", minutes: 20, intensity: "moderate" },
  { id: "peer_teaching", href: "/study/peer-teaching", icon: "Users", minutes: 30, intensity: "deep" },
  { id: "cohort_analytics", href: "/study/cohort-analytics", icon: "BarChart3", minutes: 10, intensity: "light" },
];

export function getStudyMethod(id: StudyMethodId): StudyMethod | undefined {
  return STUDY_METHODS.find((m) => m.id === id);
}

export function getMethodBySlug(slug: string): StudyMethod | undefined {
  return STUDY_METHODS.find((m) => m.href === `/study/${slug}`);
}

export function getMethodsForTier(tier: SubscriptionTier): StudyMethod[] {
  const allowed = new Set(getPlanByTier(tier).studyMethods);
  return STUDY_METHODS.filter((m) => allowed.has(m.id));
}

export function isMethodAllowed(tier: SubscriptionTier, id: StudyMethodId): boolean {
  return getPlanByTier(tier).studyMethods.includes(id);
}

export function lowestTierWithMethod(id: StudyMethodId): SubscriptionTier {
  const plan = PLANS.find((p) => p.studyMethods.includes(id));
  return plan?.id ?? "pro_scholar";
}
