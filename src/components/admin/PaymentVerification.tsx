"use client";

import { useEffect, useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Smartphone, 
  Building2, 
  Clock, 
  Info,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Loader2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Payment {
  id: string;
  userId: string;
  user: {
    name: string | null;
    email: string;
  };
  amount: number;
  currency: string;
  status: string;
  reference: string;
  gateway: string;
  phoneNumber: string | null;
  schoolName: string | null;
  contactDetails: string | null;
  tier: string;
  createdAt: string;
}

export function PaymentVerification() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState("");
  
  // Modal/Detail state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [durationDays, setDurationDays] = useState(30);
  const [verificationNote, setVerificationNote] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments/pending");
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      setError("Failed to fetch pending payments");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(status: "completed" | "rejected") {
    if (!selectedPayment) return;
    setVerifying(selectedPayment.id);
    setError("");

    try {
      const res = await fetch(`/api/admin/payments/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          status,
          durationDays: status === "completed" ? durationDays : undefined,
          note: verificationNote
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }

      setSelectedPayment(null);
      setVerificationNote("");
      setDurationDays(30);
      fetchPayments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(null);
    }
  }

  if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck size={24} className="text-emerald-600" />
          Pending Verifications
        </h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock size={16} />
          {payments.length} waiting
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {payments.length === 0 ? (
        <div className="card py-12 text-center text-slate-500">
          No pending payments found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {payments.map(payment => (
            <div 
              key={payment.id} 
              onClick={() => setSelectedPayment(payment)}
              className="card cursor-pointer transition-all hover:ring-2 hover:ring-primary-500/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    {payment.gateway} • {payment.tier}
                  </span>
                  <h3 className="font-bold text-lg mt-1">{payment.reference}</h3>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                  <p className="text-[10px] text-slate-400">{new Date(payment.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Smartphone size={14} /> {payment.phoneNumber || 'N/A'}
                </div>
                {payment.schoolName && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Building2 size={14} /> {payment.schoolName}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-xl font-bold">Verify Payment</h3>
              <button onClick={() => setSelectedPayment(null)} className="text-slate-500 hover:text-slate-700">
                <XCircle size={24} />
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reference</label>
                  <p className="font-mono text-lg font-bold">{selectedPayment.reference}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User</label>
                  <p className="font-medium">{selectedPayment.user.name || 'No Name'}</p>
                  <p className="text-sm text-slate-500">{selectedPayment.user.email}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EcoCash Number</label>
                  <p className="font-medium">{selectedPayment.phoneNumber}</p>
                </div>
                {selectedPayment.schoolName && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Organization Info</label>
                    <p className="font-bold text-emerald-600">{selectedPayment.schoolName}</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedPayment.contactDetails}</p>
                  </div>
                )}
              </div>

              <div className="space-y-6 rounded-xl bg-slate-50 p-6 dark:bg-slate-800/50">
                <div>
                  <label className="mb-2 block text-sm font-bold">Subscription Duration</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setDurationDays(30)}
                      className={`rounded-lg px-4 py-2 text-xs font-medium border transition-all ${durationDays === 30 ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700'}`}
                    >
                      30 Days (1 Month)
                    </button>
                    <button 
                      onClick={() => setDurationDays(365)}
                      className={`rounded-lg px-4 py-2 text-xs font-medium border transition-all ${durationDays === 365 ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700'}`}
                    >
                      365 Days (1 Year)
                    </button>
                  </div>
                  <div className="mt-2">
                    <input 
                      type="number" 
                      className="input w-full" 
                      placeholder="Custom days"
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">Admin Note (Reason for rejection/Internal)</label>
                  <textarea 
                    className="input min-h-[80px] w-full" 
                    placeholder="Enter any notes here..."
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    disabled={!!verifying}
                    onClick={() => handleVerify("completed")}
                    className="btn-primary flex-1 justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                  >
                    {verifying === selectedPayment.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Approve
                  </button>
                  <button 
                    disabled={!!verifying}
                    onClick={() => handleVerify("rejected")}
                    className="btn-secondary flex-1 justify-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {verifying === selectedPayment.id ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                    Reject
                  </button>
                </div>
                
                <button 
                  disabled={!!verifying}
                  onClick={async () => {
                    if (!selectedPayment) return;
                    setVerifying(selectedPayment.id);
                    try {
                      const res = await fetch('/api/admin/subscription/grace-period', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: selectedPayment.userId, hours: 48 })
                      });
                      if (res.ok) {
                        alert("48-hour grace period granted.");
                        fetchPayments();
                        setSelectedPayment(null);
                      }
                    } catch (err) {
                      alert("Failed to grant grace period");
                    } finally {
                      setVerifying(null);
                    }
                  }}
                  className="w-full mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary-600 transition-colors py-2 border border-dashed border-slate-200 rounded-lg dark:border-slate-700"
                >
                  Grant Temporary 48h Grace Period
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
