"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function PaynowStatusChecker() {
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [status, setStatus] = useState<"polling" | "completed" | "failed" | "idle">("idle");
  const router = useRouter();

  useEffect(() => {
    // Initial check for pending payments
    fetch("/api/payments/pending")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.reference) {
          setPendingPayment(data);
          setStatus("polling");
        }
      });
  }, []);

  useEffect(() => {
    if (status !== "polling" || !pendingPayment) return;

    let pollCount = 0;
    const maxPolls = 30; // 30 * 5 seconds = 2.5 minutes

    const interval = setInterval(async () => {
      pollCount++;
      try {
        const res = await fetch(`/api/paynow/check-status?reference=${pendingPayment.reference}`);
        const data = await res.json();

        if (data.status === "completed" || data.status === "paid" || data.status === "awaiting delivery") {
          setStatus("completed");
          clearInterval(interval);
          // Refresh page or session to reflect new tier
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else if (data.status === "failed" || data.status === "cancelled") {
          setStatus("failed");
          clearInterval(interval);
        } else if (pollCount >= maxPolls) {
          setStatus("idle"); // Stop polling but don't mark as failed
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status, pendingPayment]);

  if (status === "idle") return null;

  return (
    <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`flex items-center justify-between rounded-xl border p-4 shadow-sm ${
        status === "polling" ? "bg-primary-50 border-primary-100 dark:bg-primary-900/10 dark:border-primary-900/20" :
        status === "completed" ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20" :
        "bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/20"
      }`}>
        <div className="flex items-center gap-3">
          {status === "polling" ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          ) : status === "completed" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          
          <div>
            <p className="text-sm font-bold text-brand-text-primary dark:text-white">
              {status === "polling" ? "Verifying Paynow Payment..." :
               status === "completed" ? "Payment Successful!" :
               "Payment Verification Failed"}
            </p>
            <p className="text-xs text-brand-text-secondary dark:text-slate-400">
              {status === "polling" ? `Reference: ${pendingPayment.reference} - Checking for EcoCash/Card status.` :
               status === "completed" ? "Your subscription has been activated. Refreshing..." :
               "We couldn't verify your payment. Please contact support if this is an error."}
            </p>
          </div>
        </div>

        {status === "failed" && (
          <button 
            onClick={() => setStatus("idle")}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
