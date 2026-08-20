"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  Download, 
  Plus, 
  Users, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Search,
  FileSpreadsheet,
  ToggleLeft
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Organization {
  id: string;
  name: string;
  slug: string;
  prefix: string;
  dailyUploadsLimit: number;
  studyMethodsCount: number;
  maxFileSizeMb: number;
  maxMockExamQuestions: number;
  groqTokensLimit: number;
  seatLimit: number;
  priorityAiProcessing: boolean;
  _count: {
    users: number;
    ids: number;
  };
}

interface OrgID {
  id: string;
  code: string;
  tempPassword: string;
  isClaimed: boolean;
  status: string;
  trialEndsAt: string | null;
  createdAt: string;
}

export function OrgManagement() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgIds, setOrgIds] = useState<OrgID[]>([]);
  const [loading, setLoading] = useState(true);
  const [idsLoading, setIdsLoading] = useState(false);
  
  // New Org Form
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: "",
    slug: "",
    prefix: "",
    dailyUploadsLimit: 1000,
    studyMethodsCount: 14,
    maxFileSizeMb: 100,
    maxMockExamQuestions: 100,
    groqTokensLimit: 5000000,
    seatLimit: 100,
    priorityAiProcessing: true
  });

  // Generate IDs Form
  const [showGenIds, setShowGenIds] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [genStatus, setGenStatus] = useState<"trial" | "paid">("trial");

  // Selection for batch actions
  const [selectedIdKeys, setSelectedIdKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrgs();
  }, []);

  async function fetchOrgs() {
    try {
      const res = await fetch("/api/admin/organizations");
      const data = await res.json();
      setOrgs(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch orgs");
    }
  }

  async function fetchIds(orgId: string) {
    setIdsLoading(true);
    try {
      const res = await fetch(`/api/admin/generate-ids?orgId=${orgId}`);
      const data = await res.json();
      setOrgIds(data);
    } catch (error) {
      console.error("Failed to fetch IDs");
    } finally {
      setIdsLoading(false);
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrg),
      });
      if (res.ok) {
        setShowNewOrg(false);
        fetchOrgs();
        setNewOrg({
          name: "", slug: "", prefix: "",
          dailyUploadsLimit: 1000, studyMethodsCount: 14,
          maxFileSizeMb: 100, maxMockExamQuestions: 100,
          groqTokensLimit: 5000000, seatLimit: 100,
          priorityAiProcessing: true
        });
      }
    } catch (error) {
      console.error("Failed to create org");
    }
  }

  async function handleGenerateIds(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg) return;
    try {
      const res = await fetch("/api/admin/generate-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: selectedOrg.id, count: genCount, status: genStatus }),
      });
      if (res.ok) {
        setShowGenIds(false);
        fetchIds(selectedOrg.id);
        fetchOrgs(); // Update count
      }
    } catch (error) {
      console.error("Failed to generate IDs");
    }
  }

  async function handleBatchToggleStatus(status: "trial" | "paid") {
    if (selectedIdKeys.size === 0) return;
    try {
      const res = await fetch("/api/admin/generate-ids", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIdKeys), status }),
      });
      if (res.ok) {
        if (selectedOrg) fetchIds(selectedOrg.id);
        setSelectedIdKeys(new Set());
      }
    } catch (error) {
      console.error("Failed to update status");
    }
  }

  function handleExportCsv() {
    if (!orgIds.length) return;
    const headers = ["Code", "Temp Password", "Status", "Trial Ends At", "Claimed", "Created At"];
    const rows = orgIds.map(id => [
      id.code,
      id.tempPassword,
      id.status,
      id.trialEndsAt ? new Date(id.trialEndsAt).toLocaleDateString() : "N/A",
      id.isClaimed ? "Yes" : "No",
      new Date(id.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `ids-${selectedOrg?.slug || "export"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const toggleSelectAll = () => {
    if (selectedIdKeys.size === orgIds.length) {
      setSelectedIdKeys(new Set());
    } else {
      setSelectedIdKeys(new Set(orgIds.map(id => id.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIdKeys);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIdKeys(next);
  };

  if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Building2 size={24} className="text-primary-600" />
          Organizations
        </h2>
        <button 
          onClick={() => setShowNewOrg(true)}
          className="btn-primary btn-sm gap-2"
        >
          <Plus size={16} /> New Organization
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orgs.map(org => (
          <div 
            key={org.id} 
            onClick={() => { setSelectedOrg(org); fetchIds(org.id); }}
            className={`card cursor-pointer transition-all hover:ring-2 hover:ring-primary-500/50 ${selectedOrg?.id === org.id ? 'ring-2 ring-primary-500' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{org.name}</h3>
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded dark:bg-slate-800 text-slate-500">{org.prefix}</code>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </div>
            <div className="mt-4 flex gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Users size={14} /> {org._count.users}
              </div>
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet size={14} /> {org._count.ids}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedOrg && (
        <div className="card space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-xl font-bold">{selectedOrg.name} IDs</h3>
              <p className="text-sm text-slate-500">Manage batch IDs and trial status</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowGenIds(true)} className="btn-secondary btn-sm gap-2">
                <Plus size={16} /> Generate Batch
              </button>
              <button onClick={handleExportCsv} className="btn-secondary btn-sm gap-2">
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {selectedIdKeys.size > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-primary-50 p-3 dark:bg-primary-900/20 text-sm">
              <span className="font-medium text-primary-700 dark:text-primary-300">
                {selectedIdKeys.size} IDs selected
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleBatchToggleStatus("paid")}
                  className="bg-white px-3 py-1 rounded border border-primary-200 text-primary-700 hover:bg-primary-100 transition-colors dark:bg-slate-800 dark:border-primary-800 dark:text-primary-300"
                >
                  Mark Paid
                </button>
                <button 
                  onClick={() => handleBatchToggleStatus("trial")}
                  className="bg-white px-3 py-1 rounded border border-primary-200 text-primary-700 hover:bg-primary-100 transition-colors dark:bg-slate-800 dark:border-primary-800 dark:text-primary-300"
                >
                  Set as Trial
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300" 
                      checked={selectedIdKeys.size === orgIds.length && orgIds.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">ID Code</th>
                  <th className="py-3 px-4 font-semibold">Temp Password</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Claimed</th>
                  <th className="py-3 px-4 font-semibold">Trial Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {idsLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center"><LoadingSpinner size="sm" /></td></tr>
                ) : orgIds.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500">No IDs generated yet.</td></tr>
                ) : orgIds.map(id => (
                  <tr key={id.id} className={id.isClaimed ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}>
                    <td className="py-3 px-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300" 
                        checked={selectedIdKeys.has(id.id)}
                        onChange={() => toggleSelectOne(id.id)}
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">{id.code}</td>
                    <td className="py-3 px-4 font-mono text-xs">{id.tempPassword}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        id.status === 'paid' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {id.status === 'paid' ? <ShieldCheck size={12} /> : <Clock size={12} />}
                        {id.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {id.isClaimed ? (
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={14} /> Yes</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {id.trialEndsAt ? new Date(id.trialEndsAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Org Modal */}
      {showNewOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Create New Organization</h3>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <input 
                    required 
                    className="input-field mt-1" 
                    value={newOrg.name} 
                    onChange={e => setNewOrg({...newOrg, name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Slug</label>
                  <input 
                    required 
                    placeholder="e.g. harvard-univ"
                    className="input-field mt-1" 
                    value={newOrg.slug} 
                    onChange={e => setNewOrg({...newOrg, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Prefix (Optional - will auto-generate if empty)</label>
                <input 
                  placeholder="e.g. HA"
                  className="input-field mt-1" 
                  value={newOrg.prefix} 
                  onChange={e => setNewOrg({...newOrg, prefix: e.target.value.toUpperCase()})} 
                />
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <h4 className="font-semibold mb-3 text-sm uppercase text-slate-500">Resource Limits</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Daily Uploads</label>
                    <input type="number" className="input-field mt-1" value={newOrg.dailyUploadsLimit} onChange={e => setNewOrg({...newOrg, dailyUploadsLimit: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Study Methods</label>
                    <input type="number" className="input-field mt-1" value={newOrg.studyMethodsCount} onChange={e => setNewOrg({...newOrg, studyMethodsCount: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max File Size (MB)</label>
                    <input type="number" className="input-field mt-1" value={newOrg.maxFileSizeMb} onChange={e => setNewOrg({...newOrg, maxFileSizeMb: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Mock Questions</label>
                    <input type="number" className="input-field mt-1" value={newOrg.maxMockExamQuestions} onChange={e => setNewOrg({...newOrg, maxMockExamQuestions: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Groq Tokens</label>
                    <input type="number" className="input-field mt-1" value={newOrg.groqTokensLimit} onChange={e => setNewOrg({...newOrg, groqTokensLimit: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Seat Limit</label>
                    <input type="number" className="input-field mt-1" value={newOrg.seatLimit} onChange={e => setNewOrg({...newOrg, seatLimit: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input type="checkbox" checked={newOrg.priorityAiProcessing} onChange={e => setNewOrg({...newOrg, priorityAiProcessing: e.target.checked})} className="rounded" />
                  <label className="text-sm font-medium">Priority AI Processing</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn-primary flex-1 justify-center">Create Organization</button>
                <button type="button" onClick={() => setShowNewOrg(false)} className="btn-secondary px-6">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate IDs Modal */}
      {showGenIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Generate IDs for {selectedOrg?.name}</h3>
            <form onSubmit={handleGenerateIds} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Number of IDs to generate</label>
                <input 
                  type="number" 
                  min="1" 
                  max="1000"
                  className="input-field mt-1" 
                  value={genCount} 
                  onChange={e => setGenCount(parseInt(e.target.value))} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Initial Status</label>
                <select 
                  className="input-field mt-1"
                  value={genStatus}
                  onChange={e => setGenStatus(e.target.value as any)}
                >
                  <option value="trial">7-Day Trial</option>
                  <option value="paid">Paid (Active)</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn-primary flex-1 justify-center">Generate Batch</button>
                <button type="button" onClick={() => setShowGenIds(false)} className="btn-secondary px-6">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
