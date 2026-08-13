"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/shared/NavBar";
import { LegalFooter } from "@/components/shared/LegalFooter";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AdminStats } from "@/types";
import { PLANS } from "@/lib/plans";
import { Users, CreditCard, FileText, Brain, ClipboardList, Shield } from "lucide-react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Forbidden");
        return r.json();
      })
      .then(setStats)
      .catch(() => setError("Access denied or failed to load stats"));
  }, []);

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!session) { redirect("/login"); return null; }

  const statCards = stats ? [
    { icon: Users, label: "Total Users", value: stats.totalUsers, color: "text-blue-600" },
    { icon: CreditCard, label: "Paid Subscriptions", value: stats.activeSubscriptions, color: "text-green-600" },
    { icon: Shield, label: "Trial Users", value: stats.trialUsers, color: "text-purple-600" },
    { icon: FileText, label: "Documents", value: stats.totalDocuments, color: "text-orange-600" },
    { icon: Brain, label: "Flashcards", value: stats.totalFlashcards, color: "text-indigo-600" },
    { icon: ClipboardList, label: "Mock Exams", value: stats.totalMockExams, color: "text-red-600" },
  ] : [];

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">System overview — Axiom Neural Systems</p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {statCards.map((s) => (
                <div key={s.label} className="card text-center">
                  <s.icon className={`h-6 w-6 ${s.color} mx-auto mb-2`} />
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card">
                <h3 className="font-semibold mb-4">Plan Breakdown</h3>
                <div className="space-y-2">
                  {PLANS.map((plan) => (
                    <div key={plan.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium">{plan.name}</span>
                      <span className="text-sm bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                        {stats.planBreakdown[plan.id] ?? 0} users
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-4">Recent Signups</h3>
                <div className="space-y-3">
                  {stats.recentSignups.length === 0 ? (
                    <p className="text-gray-500 text-sm">No users yet</p>
                  ) : (
                    stats.recentSignups.map((u) => (
                      <div key={u.id} className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">{u.name || "Unnamed"}</p>
                          <p className="text-gray-500">{u.email}</p>
                        </div>
                        <span className="text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <LegalFooter />
    </div>
  );
}
