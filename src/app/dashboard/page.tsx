"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, GraduationCap, Target } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatCard } from "@/components/ui/StatCard";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { WeaknessHeatmap } from "@/components/dashboard/WeaknessHeatmap";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { UploadQuotaCard } from "@/components/dashboard/UploadQuotaCard";
import { PlanPanel } from "@/components/dashboard/PlanPanel";
import { DashboardStats, SubscriptionStatus, UploadQuota } from "@/types";

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [quota, setQuota] = useState<UploadQuota | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [statsRes, subRes, quotaRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/subscription"),
        fetch("/api/upload"),
      ]);
      if (!statsRes.ok || !subRes.ok || !quotaRes.ok) throw new Error("Failed to load dashboard");

      setStats((await statsRes.json()) as DashboardStats);
      setSubscription((await subRes.json()) as SubscriptionStatus);
      setQuota((await quotaRes.json()) as UploadQuota);
      setError("");
    } catch {
      setError(t.common.error);
    }
  }, [t.common.error]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/dashboard");
    if (status === "authenticated") void load();
  }, [status, router, load]);

  if (status === "loading" || (!stats && !error)) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (error || !stats || !subscription || !quota) {
    return (
      <AppShell>
        <div className="card text-center">
          <p>{error || t.common.error}</p>
          <button type="button" onClick={() => void load()} className="btn-primary mt-4">
            {t.common.retry}
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {t.dashboard.greeting}, {session?.user?.name ?? ""}
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">{t.common.tagline}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <StreakCard
          streak={stats.streak}
          longestStreak={stats.longestStreak}
          studiedToday={stats.studiedToday}
          activity={stats.last14Days}
        />
        <div className="lg:col-span-2">
          <GoalProgress
            minutesToday={stats.minutesToday}
            dailyGoal={stats.dailyGoal}
            dailyGoalPct={stats.dailyGoalPct}
            topicsThisWeek={stats.topicsThisWeek}
            weeklyGoal={stats.weeklyGoal}
            weeklyGoalPct={stats.weeklyGoalPct}
            onGoalsUpdated={() => void load()}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label={t.dashboard.documents} value={stats.docCount} />
        <StatCard icon={BookOpen} label={t.dashboard.flashcards} value={stats.flashcardCount} />
        <StatCard icon={GraduationCap} label={t.dashboard.mockExams} value={stats.mockExamCount} />
        <StatCard
          icon={Target}
          label={t.dashboard.averageScore}
          value={`${stats.averageScore}%`}
          tone={stats.averageScore >= 70 ? "success" : "warning"}
        />
      </div>

      <div className="mt-4">
        <PlanPanel subscription={subscription} stats={stats} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuickActions tier={subscription.tier} />
        </div>
        <UploadQuotaCard quota={quota} />
      </div>

      <div className="mt-4">
        <WeaknessHeatmap cells={stats.weaknessMatrix} />
      </div>
    </AppShell>
  );
}
