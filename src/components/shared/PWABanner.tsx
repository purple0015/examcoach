"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "examcoach_pwa_dismissed";

export function PWABanner() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md animate-slide-up rounded-2xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
        <div className="flex-1">
          <p className="font-semibold">{t.common.installApp}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">{t.common.installBody}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-primary py-1.5 text-xs"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                setDeferred(null);
              }}
            >
              {t.common.install}
            </button>
            <button type="button" className="btn-ghost py-1.5 text-xs" onClick={dismiss}>
              {t.common.dismiss}
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label={t.common.dismiss} className="p-1">
          <X className="h-4 w-4 text-stone-400" aria-hidden />
        </button>
      </div>
    </div>
  );
}
