"use client";

import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <AppShell width="narrow">
      <h1 className="text-2xl font-bold">{t.footer.privacy}</h1>
      <div className="card mt-6 space-y-3 text-sm text-stone-600 dark:text-stone-300">
        <p>
          ExamCoach stores the account details you provide (name, email), the study material you
          upload, and the study activity used to calculate streaks, goals and progress.
        </p>
        <p>
          Uploaded documents are processed by Google Gemini to generate topics, flashcards and mock
          exams. They are never sold or shared with third parties for advertising.
        </p>
        <p>
          Payments are handled by PayPal; ExamCoach never receives or stores your card details.
        </p>
        <p>
          You can request deletion of your account and all associated study data by contacting
          support.
        </p>
      </div>
    </AppShell>
  );
}
