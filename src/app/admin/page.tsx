"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Brain, ClipboardList, CreditCard, FileText, Shield, Users } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatCard } from "@/components/ui/StatCard";
import { PLANS } from "@/lib/plans";
import { AdminStats } from "@/types";
import { OrgManagement } from "@/components/admin/OrgManagement";

export default function AdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"stats" | "orgs">("stats");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/admin");
    if (status !== "authenticated") return;

    void fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("forbidden");
        return res.json();
      })
      .then((data) => setStats(data as AdminStats))
      .catch(() => setError(t.admin.accessDenied));
  }, [status, router, t.admin.accessDenied]);

  if (error) {
    return (
      <AppShell>
        <div className="card text-center">{error}</div>
      </AppShell>
    );
  }

  if (!stats) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{t.admin.title}</h1>
        <p className="text-sm text-brand-text-secondary dark:text-slate-400">{t.admin.subtitle}</p>
      </header>

      {/* Admin Tabs */}
      <div className="mb-6 flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "stats" 
              ? "border-primary-500 text-primary-600" 
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          System Stats
        </button>
        <button
          onClick={() => setActiveTab("orgs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "orgs" 
              ? "border-primary-500 text-primary-600" 
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Organizations & IDs
        </button>
      </div>

      {activeTab === "stats" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={Users} label={t.admin.totalUsers} value={stats.totalUsers} tone="primary" />
            <StatCard
              icon={CreditCard}
              label={t.admin.paidSubs}
              value={stats.activeSubscriptions}
              tone="success"
            />
            <StatCard icon={Shield} label={t.admin.trialUsers} value={stats.trialUsers} tone="warning" />
            <StatCard icon={FileText} label={t.admin.documents} value={stats.totalDocuments} />
            <StatCard icon={Brain} label={t.admin.flashcards} value={stats.totalFlashcards} />
            <StatCard icon={ClipboardList} label={t.admin.mockExams} value={stats.totalMockExams} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card">
              <h2 className="font-semibold">{t.admin.planBreakdown}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {PLANS.map((plan) => (
                  <li key={plan.id} className="flex items-center justify-between">
                    <span>{plan.name}</span>
                    <span className="font-medium">
                      {stats.planBreakdown[plan.id] ?? 0} {t.admin.users}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card">
              <h2 className="font-semibold">{t.admin.recentSignups}</h2>
              {stats.recentSignups.length === 0 ? (
                <p className="mt-3 text-sm text-brand-text-secondary dark:text-slate-400">{t.admin.noUsers}</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  {stats.recentSignups.map((user) => (
                    <li key={user.id} className="flex items-center justify-between py-2">
                      <span>{user.name ?? user.email}</span>
                      <span className="text-brand-text-secondary dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      ) : (
        <OrgManagement />
      )}
    </AppShell>
  );
}
