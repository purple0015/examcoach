"use client";

import Link from "next/link";
import { Building2, GraduationCap, HeartHandshake, Sparkles, Target, Users } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardStats, SubscriptionStatus } from "@/types";
import { getPlanByTier } from "@/lib/plans";

/** Plan-specific dashboard section rendered underneath the shared streak/goal widgets. */
export function PlanPanel({
  subscription,
  stats,
}: {
  subscription: SubscriptionStatus;
  stats: DashboardStats;
}) {
  const { t } = useI18n();
  const plan = getPlanByTier(subscription.tier);
  const seatUsage = `${subscription.seats} ${t.common.of} ${subscription.maxSeats}`;

  const variants = {
    starter: {
      icon: Sparkles,
      title: t.dashboard.trialTitle,
      body: t.dashboard.trialBody,
      tiles: [
        { label: t.pricing.studyMethods, value: plan.studyMethods.length },
        { label: t.pricing.uploadsPerDay, value: plan.limits.dailyUploads },
        { label: "Groq Speed", value: "Basic" },
      ],
    },
    individual: {
      icon: Target,
      title: `${plan.name} ${t.dashboard.planDashboard}`,
      body: t.study.subtitle,
      tiles: [
        { label: t.dashboard.masteredTopics, value: stats.topicsMastered },
        { label: t.dashboard.averageScore, value: `${stats.averageScore}%` },
        { label: t.dashboard.mockExams, value: stats.mockExamCount },
      ],
    },
    family: {
      icon: Users,
      title: t.dashboard.householdTitle,
      body: t.dashboard.householdBody,
      tiles: [
        { label: t.dashboard.seatsUsed, value: seatUsage },
        { label: t.dashboard.flashcards, value: stats.flashcardCount },
        { label: t.dashboard.longestStreak, value: `${stats.longestStreak} ${t.common.days}` },
      ],
    },
    school: {
      icon: GraduationCap,
      title: t.dashboard.cohortTitle,
      body: t.dashboard.cohortBody,
      tiles: [
        { label: t.dashboard.seatsUsed, value: seatUsage },
        { label: t.dashboard.averageScore, value: `${stats.averageScore}%` },
        { label: t.dashboard.documents, value: stats.docCount },
      ],
    },
    ministry: {
      icon: Building2,
      title: t.dashboard.districtTitle,
      body: t.dashboard.districtBody,
      tiles: [
        { label: t.dashboard.seatsUsed, value: seatUsage },
        { label: t.dashboard.mockExams, value: stats.mockExamCount },
        { label: t.dashboard.averageScore, value: `${stats.averageScore}%` },
      ],
    },
    ngo: {
      icon: HeartHandshake,
      title: t.dashboard.outreachTitle,
      body: t.dashboard.outreachBody,
      tiles: [
        { label: t.dashboard.seatsUsed, value: seatUsage },
        { label: t.dashboard.documents, value: stats.docCount },
        { label: t.dashboard.flashcards, value: stats.flashcardCount },
      ],
    },
  } as const;

  const variant = variants[subscription.dashboard];
  const Icon = variant.icon;

  return (
    <section className="card">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold">{variant.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{variant.body}</p>
        </div>
        {subscription.isTrial && (
          <Link href="/pricing" className="btn-primary shrink-0">
            {t.common.upgrade}
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {variant.tiles.map((tile) => (
          <StatCard key={tile.label} icon={Icon} label={tile.label} value={tile.value} tone="primary" />
        ))}
      </div>
    </section>
  );
}
