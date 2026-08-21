"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Smartphone, CheckCircle, Info, ArrowLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PLANS } from "@/lib/plans";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

function EcoCashCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const tier = searchParams.get("tier");
  const plan = PLANS.find((p) => p.id === tier);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    reference: "",
    phoneNumber: "",
    schoolName: "",
    contactDetails: "",
  });

  if (!plan || status !== "authenticated") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invalid Request</h2>
        <p className="text-slate-500">Please select a valid plan from the pricing page.</p>
        <Link href="/pricing" className="btn-primary">
          Back to Pricing
        </Link>
      </div>
    );
  }

  const isInstitutional = ["school", "ministry", "ngo"].includes(plan.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: plan?.id,
          gateway: "ecocash",
          ...formData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit payment proof");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle size={48} />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Proof Submitted!</h1>
        <p className="mt-4 text-brand-text-secondary">
          Thank you. Our team is now verifying your EcoCash transaction. This usually takes 2-6 hours.
        </p>
        <p className="mt-2 text-sm text-brand-text-secondary">
          You will be redirected to the dashboard shortly.
        </p>
        <div className="mt-8">
          <Link href="/dashboard" className="btn-primary w-full justify-center">
            Go to Dashboard Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link 
        href="/pricing" 
        className="mb-8 flex items-center gap-2 text-sm font-medium text-brand-text-secondary hover:text-brand-text-primary"
      >
        <ArrowLeft size={16} /> Back to Pricing
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h1 className="text-2xl font-bold">Manual EcoCash Payment</h1>
          <p className="mt-2 text-brand-text-secondary">
            Follow the steps below to complete your payment for the <span className="font-bold text-brand-text-primary">{plan.name}</span>.
          </p>

          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-emerald-500 bg-emerald-50 p-6 dark:border-emerald-700 dark:bg-emerald-900/20">
              <h2 className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                <Smartphone size={20} /> Transfer Details
              </h2>
              <div className="mt-4 space-y-4 text-sm text-emerald-900 dark:text-emerald-300">
                <div>
                  <p className="font-medium opacity-70 uppercase tracking-wider text-[10px]">Recipient Name</p>
                  <p className="text-lg font-bold">Sibonginkosi Moyo</p>
                </div>
                <div>
                  <p className="font-medium opacity-70 uppercase tracking-wider text-[10px]">EcoCash Number / Wallet</p>
                  <p className="text-lg font-bold">0775993734</p>
                </div>
                <div>
                  <p className="font-medium opacity-70 uppercase tracking-wider text-[10px]">Amount to Send</p>
                  <p className="text-lg font-bold">{formatCurrency(plan.price)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-surface-light p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 font-bold">
                <Info size={20} className="text-primary-500" /> Instructions
              </h2>
              <ol className="mt-4 list-decimal space-y-3 pl-4 text-sm text-brand-text-secondary">
                <li>Dial <span className="font-bold text-brand-text-primary">*151#</span> on your EcoCash line and select <span className="font-bold text-brand-text-primary">&apos;Send Money&apos;</span> (or dial <span className="font-bold text-brand-text-primary">*151*1*1*0775993734*{plan.price}#</span>).</li>
                <li>Enter recipient number <span className="font-bold text-brand-text-primary">0775993734</span> and the required amount.</li>
                <li>Verify recipient name appears as <span className="font-bold text-brand-text-primary">Sibonginkosi Moyo</span> and enter your PIN to authorize.</li>
                <li>Wait for the EcoCash confirmation SMS with the <span className="font-bold text-brand-text-primary">Transaction Reference Code</span>.</li>
                <li>Enter the reference code into the form to complete verification.</li>
              </ol>
            </div>
          </div>
        </div>

        <div>
          <div className="card sticky top-24">
            <h2 className="mb-6 text-xl font-bold">Submit Payment Proof</h2>
            
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">EcoCash Reference Code</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. MP230821.1234.B12345"
                  className="input w-full uppercase"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">EcoCash Phone Number</label>
                <input
                  required
                  type="tel"
                  placeholder="077XXXXXXX"
                  className="input w-full"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>

              {isInstitutional && (
                <>
                  <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                    <label className="mb-1.5 block text-sm font-medium">School / Organization Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Enter school name"
                      className="input w-full"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Contact Details (Head/Admin)</label>
                    <textarea
                      required
                      placeholder="Name and Phone/Email of contact person"
                      className="input w-full min-h-[80px]"
                      value={formData.contactDetails}
                      onChange={(e) => setFormData({ ...formData, contactDetails: e.target.value })}
                    />
                  </div>
                </>
              )}

              <button
                disabled={loading}
                type="submit"
                className="btn-primary w-full justify-center py-4 text-base shadow-lg shadow-primary-200 dark:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Submitting...
                  </>
                ) : (
                  "Verify Payment"
                )}
              </button>
              
              <p className="text-center text-[10px] text-brand-text-secondary">
                By submitting, you agree that providing false information will result in immediate account suspension without refund.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EcoCashCheckoutPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="animate-spin text-primary-600" size={40} />
        </div>
      }>
        <EcoCashCheckoutContent />
      </Suspense>
    </AppShell>
  );
}
