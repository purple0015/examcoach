"use client";

import Link from "next/link";
import { useI18n } from "@/components/providers/I18nProvider";

export function LegalFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-stone-200 py-6 text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} Axiom Neural Systems by Silethemba. {t.footer.rights}
        </p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-primary-600 dark:hover:text-primary-400">
            {t.footer.privacy}
          </Link>
          <Link href="/terms" className="hover:text-primary-600 dark:hover:text-primary-400">
            {t.footer.terms}
          </Link>
        </div>
      </div>
    </footer>
  );
}
