"use client";

import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";

export default function TermsPage() {
  const { t } = useI18n();

  return (
    <AppShell width="narrow">
      <h1 className="text-2xl font-bold">{t.footer.terms}</h1>
      <div className="card mt-6 space-y-3 text-sm text-brand-text-primary dark:text-slate-300">
        <p>
          ExamCoach provides AI-generated study material. Answers may contain mistakes, so always
          check important facts against your syllabus and teacher.
        </p>
        <p>
          Each plan includes a daily upload allowance and a set of study methods. Exceeding the
          allowance pauses uploads until the next day or until you upgrade.
        </p>
        <p>
          Subscriptions renew monthly through PayPal and can be cancelled at any time from your
          PayPal account.
        </p>
        <p>
          Only upload material you have the right to use. Accounts that share seats beyond the plan
          limit may be suspended.
        </p>
      </div>
    </AppShell>
  );
}
