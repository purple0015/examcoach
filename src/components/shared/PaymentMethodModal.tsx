"use client";

import { CreditCard, X } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: "paypal" | "paynow") => void;
  tierName: string;
}

export function PaymentMethodModal({ isOpen, onClose, onSelect, tierName }: PaymentMethodModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <h3 className="text-xl font-bold">Select Payment Method</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <p className="text-sm text-brand-text-secondary dark:text-slate-400">
            Choose how you would like to pay for the <span className="font-bold text-brand-text-primary dark:text-white">{tierName}</span> plan.
          </p>

          <button
            onClick={() => onSelect("paypal")}
            className="flex w-full items-center gap-4 rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-primary-500 hover:bg-primary-50 dark:border-slate-700 dark:hover:bg-primary-900/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="font-bold text-brand-text-primary dark:text-white">PayPal / Global Card</p>
              <p className="text-xs text-brand-text-secondary">International cards & PayPal balance</p>
            </div>
          </button>

          <button
            onClick={() => onSelect("paynow")}
            className="flex w-full items-center gap-4 rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-emerald-900/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-brand-text-primary dark:text-white">Paynow (ZW Local)</p>
              <p className="text-xs text-brand-text-secondary">EcoCash, OneMoney, Zimswitch & Local Cards</p>
            </div>
          </button>
        </div>

        <div className="mt-8">
          <button onClick={onClose} className="btn-secondary w-full justify-center">
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Zap({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
