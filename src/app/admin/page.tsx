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
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "payments" | "orgs" | "ids">("stats");
  const [orgs, setOrgs] = useState<any[]>([]);
  const [ids, setIds] = useState<any[]>([]);

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
        const [statsRes, usersRes, orgsRes, idsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/management"),
          fetch("/api/admin/organizations"),
          fetch("/api/admin/generate-ids")
        ]);

        if (!statsRes.ok || !usersRes.ok || !orgsRes.ok || !idsRes.ok) throw new Error("Failed to fetch admin data");

        setStats(await statsRes.json());
        setUsers(await usersRes.json());
        setOrgs(await orgsRes.json());
        setIds(await idsRes.json());
      } catch (err) {
        setError("Error loading system data");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [status, router, isAdmin]);

  const generateIds = async (orgId: string, count: number, status: string) => {
    try {
      const res = await fetch("/api/admin/generate-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, count, status }),
      });
      if (res.ok) {
        const newIds = await res.json();
        setIds([...newIds, ...ids]);
        alert(`Successfully generated ${count} IDs`);
      }
    } catch {
      alert("Error generating IDs");
    }
  };

  const createOrg = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      prefix: formData.get("prefix"),
      colors: {
        primary: formData.get("primary"),
        accent: formData.get("accent"),
      },
      limits: {
        dailyUploads: 1000,
        maxFileSizeMb: 100,
        mockExamQuestions: 100,
        flashcardsPerBatch: 50,
        aiRequestsPerDay: 5000,
        groqTokenLimit: 5000000,
        hasPriorityInference: true,
      }
    };

    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newOrg = await res.json();
        setOrgs([newOrg, ...orgs]);
        e.target.reset();
      }
    } catch {
      alert("Error creating organization");
    }
  };

  const exportIds = (orgId: string) => {
    const orgIds = ids.filter(i => i.orgId === orgId);
    const csv = [
      ["Code", "Temporary Password", "Status", "Trial Ends At"],
      ...orgIds.map(i => [i.code, i.tempPassword, i.status, i.trialEndsAt])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ids_${orgId}.csv`;
    a.click();
  };

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
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-[#FAFAFA] p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 md:p-12">
          {/* Subtle gradient center shine */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white_0%,_transparent_70%)] opacity-50 dark:opacity-10 pointer-events-none" />
          
          <div className="relative z-10">
            <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-orange-600 dark:text-orange-400">
                  System Administration
                </h1>
                <p className="mt-2 text-orange-950/60 dark:text-orange-200/60 font-medium">
                  Monitoring & Unlimited Access Panel
                </p>
              </div>
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/50">
                {(["stats", "users", "payments", "orgs", "ids"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
                      activeTab === tab
                        ? "bg-white text-orange-600 shadow-sm dark:bg-slate-700 dark:text-orange-400"
                        : "text-slate-500 hover:text-orange-600/70 dark:text-slate-400"
                    }`}
                  >
                    {tab === "orgs" ? "Organizations" : tab === "ids" ? "Group IDs" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </header>

            {activeTab === "stats" && stats && (
              <div className="space-y-12">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard icon={Users} label="Total Users" value={stats.totalUsers} tone="admin" />
                  <StatCard icon={CreditCard} label="Paid Subs" value={stats.activeSubscriptions} tone="admin" />
                  <StatCard icon={Shield} label="Trial Users" value={stats.trialUsers} tone="admin" />
                  <StatCard icon={FileText} label="Total Documents" value={stats.totalDocuments} tone="admin" />
                  <StatCard icon={Brain} label="Flashcards Generated" value={stats.totalFlashcards} tone="admin" />
                  <StatCard icon={ClipboardList} label="Exams Created" value={stats.totalMockExams} tone="admin" />
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                  <section className="card border-slate-200/60 bg-white/50 dark:bg-slate-800/20">
                    <div className="mb-6 flex items-center gap-3">
                      <Activity className="h-6 w-6 text-orange-500" />
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Plan Distribution</h2>
                    </div>
                    <ul className="space-y-4">
                      {PLANS.map((plan) => {
                        const count = stats.planBreakdown[plan.id] ?? 0;
                        const percentage = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0;
                        return (
                          <li key={plan.id}>
                            <div className="mb-2 flex justify-between text-sm">
                              <span className="font-bold text-slate-700 dark:text-slate-300">{plan.name}</span>
                              <span className="text-orange-600 font-medium">{count} users ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-peach-400 via-orange-400 to-amber-500" 
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: '#f97316' // Fallback orange
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  <section className="card border-slate-200/60 bg-white/50 dark:bg-slate-800/20">
                    <div className="mb-6 flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 text-orange-500" />
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">System Health</h2>
                    </div>
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-5 dark:border-orange-900/20 dark:bg-orange-900/5">
                        <div className="flex items-center gap-4">
                          <CheckCircle2 className="h-6 w-6 text-orange-500" />
                          <div>
                            <p className="text-sm font-black text-orange-900 dark:text-orange-300 uppercase tracking-wider">All Systems Operational</p>
                            <p className="text-xs text-orange-800/70 dark:text-orange-400/70 mt-0.5 font-medium">Gemini & Groq APIs responding within normal latency.</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Database Load</p>
                          <p className="text-2xl font-black text-orange-600">2.4%</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Storage Used</p>
                          <p className="text-2xl font-black text-orange-600">14.2 GB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => void setupPayPal()}
                        className="w-full rounded-2xl bg-orange-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-orange-600/30 active:scale-[0.98]"
                      >
                        Setup PayPal Products & Plans
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-orange-400" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-6 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-orange-500/20 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div className="card overflow-hidden border-slate-200/60 p-0 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b bg-slate-50/50 text-slate-500 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">User</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Tier</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Resources</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Joined</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-colors">
                            <td className="px-6 py-5">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{user.name || "Unnamed User"}</div>
                              <div className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">{user.email}</div>
                            </td>
                            <td className="px-6 py-5">
                              <select 
                                value={user.subscriptions[0]?.tier || "starter_free"}
                                onChange={(e) => void updateSubscription(user.id, e.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {PLANS.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex gap-4 text-orange-600/60 dark:text-orange-400/60 font-bold">
                                <div title="Flashcards" className="flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" />{user._count.flashcards}</div>
                                <div title="Documents" className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{user._count.documents}</div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-slate-500 font-medium">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <button 
                                onClick={() => void deleteUser(user.id)}
                                className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20"
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
              <div className="card overflow-hidden border-slate-200/60 p-0 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-slate-50/50 text-slate-500 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Date</th>
                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">User</th>
                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Gateway</th>
                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Amount</th>
                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Status</th>
                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allPayments.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-colors">
                          <td className="px-6 py-5 text-slate-500 font-medium">
                            {new Date(payment.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-800 dark:text-slate-200">{payment.userEmail}</td>
                          <td className="px-6 py-5"><span className="text-[10px] font-black uppercase tracking-widest text-orange-600/70 bg-orange-50 px-2 py-1 rounded-lg dark:bg-orange-900/20">{payment.gateway}</span></td>
                          <td className="px-6 py-5 font-black text-orange-600">{formatCurrency(payment.amount)}</td>
                          <td className="px-6 py-5">
                            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                              payment.status === 'completed' 
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                : payment.status === 'pending'
                                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                  : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 font-mono text-[10px] text-slate-400">{payment.reference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === "orgs" && (
              <div className="space-y-8">
                <section className="card">
                  <h2 className="text-xl font-bold mb-6">Create New Organization</h2>
                  <form onSubmit={createOrg} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <input name="name" placeholder="Organization Name" required className="input-field" />
                    <input name="slug" placeholder="Slug (e.g. green-school)" required className="input-field" />
                    <input name="prefix" placeholder="ID Prefix (2 chars)" required maxLength={2} className="input-field" />
                    <input name="primary" placeholder="Primary Color (Hex)" className="input-field" />
                    <input name="accent" placeholder="Accent Color (Hex)" className="input-field" />
                    <button type="submit" className="btn-primary">Create Organization</button>
                  </form>
                </section>

                <div className="card overflow-hidden border-slate-200/60 p-0 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b bg-slate-50/50 text-slate-500 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Organization</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Slug</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Prefix</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Colors</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Users / IDs</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {orgs.map((org) => (
                          <tr key={org.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-colors">
                            <td className="px-6 py-5 font-bold">{org.name}</td>
                            <td className="px-6 py-5 text-slate-500">{org.slug}</td>
                            <td className="px-6 py-5 font-mono font-bold text-orange-600">{org.prefix}</td>
                            <td className="px-6 py-5">
                              <div className="flex gap-2">
                                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: org.colors?.primary }} />
                                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: org.colors?.accent }} />
                              </div>
                            </td>
                            <td className="px-6 py-5">{org._count.users} / {org._count.ids}</td>
                            <td className="px-6 py-5 text-right">
                              <button onClick={() => exportIds(org.id)} className="btn-secondary py-1 px-3 text-xs">Export CSV</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ids" && (
              <div className="space-y-8">
                <section className="card">
                  <h2 className="text-xl font-bold mb-6">Bulk Generate Group IDs</h2>
                  <form onSubmit={(e: any) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    generateIds(fd.get("orgId") as string, Number(fd.get("count")), fd.get("status") as string);
                  }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <select name="orgId" required className="input-field">
                      <option value="">Select Organization</option>
                      {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <input name="count" type="number" placeholder="Count" required min={1} max={100} className="input-field" />
                    <select name="status" className="input-field">
                      <option value="trial">7-Day Free Trial</option>
                      <option value="paid">Pre-marked Paid</option>
                    </select>
                    <button type="submit" className="btn-primary">Generate IDs</button>
                  </form>
                </section>

                <div className="card overflow-hidden border-slate-200/60 p-0 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b bg-slate-50/50 text-slate-500 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Code</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Temp Password</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Organization</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Status</th>
                          <th className="px-6 py-5 font-bold uppercase tracking-wider text-[10px]">Claimed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ids.map((id) => (
                          <tr key={id.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-colors">
                            <td className="px-6 py-5 font-mono font-bold text-orange-600">{id.code}</td>
                            <td className="px-6 py-5 font-mono text-slate-500">{id.tempPassword}</td>
                            <td className="px-6 py-5">{id.organization.name}</td>
                            <td className="px-6 py-5">
                              <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${id.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {id.status}
                              </span>
                            </td>
                            <td className="px-6 py-5">{id.isClaimed ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
