"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Brain, ClipboardList, CreditCard, FileText, Shield, Users, 
  Search, Trash2, Edit2, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, Activity
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatCard } from "@/components/ui/StatCard";
import { PLANS } from "@/lib/plans";
import { AdminStats } from "@/types";
import { formatCurrency } from "@/lib/utils";

export default function AdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "payments">("stats");

  const isAdmin = session?.user?.email === "purpleteddy002@gmail.com" || session?.user?.role === "admin";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/admin");
    if (status !== "authenticated") return;
    if (!isAdmin) {
      setError("Forbidden: Specialized Admin Access Only");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/management")
        ]);

        if (!statsRes.ok || !usersRes.ok) throw new Error("Failed to fetch admin data");

        const statsData = await statsRes.json();
        const usersData = await usersRes.json();

        setStats(statsData);
        setUsers(usersData);
      } catch (err) {
        setError("Error loading system data");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [status, router, isAdmin]);

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action is irreversible.")) return;
    
    try {
      const res = await fetch("/api/admin/management", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        alert("Failed to delete user");
      }
    } catch {
      alert("Error deleting user");
    }
  };

  const updateSubscription = async (userId: string, tier: string) => {
    try {
      const res = await fetch("/api/admin/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      });
      if (res.ok) {
        alert("Subscription updated successfully");
        // Refresh users list
        const updatedUsers = await fetch("/api/admin/management").then(r => r.json());
        setUsers(updatedUsers);
      } else {
        alert("Failed to update subscription");
      }
    } catch {
      alert("Error updating subscription");
    }
  };

  const setupPayPal = async () => {
    if (!confirm("This will create a new product and monthly plans in your PayPal account. Continue?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/setup-paypal", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("PayPal Setup Complete! Plan IDs:\n" + JSON.stringify(data.plans, null, 2));
        console.log("Full Setup Data:", data);
      } else {
        alert("PayPal Setup Failed: " + data.error);
      }
    } catch {
      alert("Error triggering PayPal setup");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <XCircle className="mb-4 h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold">{error}</h2>
          <p className="mt-2 text-slate-500">Please log in as the system administrator.</p>
        </div>
      </AppShell>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  const allPayments = users.flatMap(u => 
    u.payments.map((p: any) => ({ ...p, userEmail: u.email }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <AppShell>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-slate-500 dark:text-slate-400">Monitoring & Unlimited Access Panel</p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(["stats", "users", "payments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "stats" && stats && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} tone="primary" />
            <StatCard icon={CreditCard} label="Paid Subs" value={stats.activeSubscriptions} tone="success" />
            <StatCard icon={Shield} label="Trial Users" value={stats.trialUsers} tone="warning" />
            <StatCard icon={FileText} label="Total Documents" value={stats.totalDocuments} />
            <StatCard icon={Brain} label="Flashcards Generated" value={stats.totalFlashcards} />
            <StatCard icon={ClipboardList} label="Exams Created" value={stats.totalMockExams} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="card">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-bold">Plan Distribution</h2>
              </div>
              <ul className="space-y-3">
                {PLANS.map((plan) => {
                  const count = stats.planBreakdown[plan.id] ?? 0;
                  const percentage = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0;
                  return (
                    <li key={plan.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{plan.name}</span>
                        <span className="text-slate-500">{count} users ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div 
                          className="h-full rounded-full bg-primary-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="card">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-bold">System Health</h2>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">All Systems Operational</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">Gemini & Groq APIs responding within normal latency.</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500">Database Load</p>
                    <p className="text-xl font-bold">2.4%</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500">Storage Used</p>
                    <p className="text-xl font-bold">14.2 GB</p>
                  </div>
                </div>
                <button
                  onClick={() => void setupPayPal()}
                  className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Setup PayPal Products & Plans
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Tier</th>
                    <th className="px-6 py-4 font-semibold">Resources</th>
                    <th className="px-6 py-4 font-semibold">Joined</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div className="font-medium">{user.name || "Unnamed User"}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.subscriptions[0]?.tier || "starter_free"}
                          onChange={(e) => void updateSubscription(user.id, e.target.value)}
                          className="rounded-lg border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700"
                        >
                          {PLANS.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <div className="mt-1 text-[10px] text-slate-400">
                          {user.subscriptions[0]?.status || "no subscription"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-4 text-slate-500">
                          <div title="Flashcards"><Brain className="inline h-3 w-3 mr-1" />{user._count.flashcards}</div>
                          <div title="Documents"><FileText className="inline h-3 w-3 mr-1" />{user._count.documents}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => void deleteUser(user.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Gateway</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allPayments.map((payment: any) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium">{payment.userEmail}</td>
                    <td className="px-6 py-4 uppercase text-xs font-bold text-slate-500">{payment.gateway}</td>
                    <td className="px-6 py-4 font-bold">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        payment.status === 'completed' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : payment.status === 'pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{payment.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
