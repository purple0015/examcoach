# ExamCoach PWA

AI-powered study companion by **Axiom Neural Systems** (Silethemba).

## Features

- **Landing page** with greeting and proceed flow
- **Auth** — email/password signup + Google OAuth
- **7-day free trial** — auto-assigned on signup
- **Subscription plans** — Individual, Family, School, Ministry, NGO
- **Multilingual** — English, Ndebele (nd), Shona (sn), French (fr), Spanish (es), Portuguese (pt), Arabic (ar), Mandarin Chinese (zh), and Swahili (sw) across UI *and* AI output
- **Dark mode** — light / dark / system, persisted per user with no flash on load
- **Per-plan dashboards** — a dedicated dashboard variant per tier (trial, individual, household, cohort, district, outreach)
- **Streaks & goals** — current/longest streak, daily minute goal, weekly minute + topic goals
- **14 study methods** — flashcards, active recall, spaced repetition, Pomodoro, Feynman, mock exams,
  Cornell notes, blurting, mind maps, interleaving, past-paper drills, exam blueprints, peer teaching,
  cohort analytics — gated by plan
- **Upload page** — drag & drop with per-plan daily upload count and file-size limits
- **Admin dashboard** — users, plans, system stats
- **PWA** — installable, offline-capable

## Subscription Plans

| Plan | Price | Seats | Daily uploads | Max file size |
|------|-------|-------|---------------|---------------|
| 7-Day Free Trial | Free | 1 | 50 | 25 MB |
| Starter (Free) | Free | 1 | 5 | 10 MB |
| Pro Scholar | $9.99/mo | 1 | 50 | 25 MB |
| Global Elite | $24.99/mo | 2 | 500 | 100 MB |
| School | $199.99/mo | 100 | 1000 | 100 MB |
| Ministry | $999.99/mo | 1000 | 5000 | 200 MB |
| NGO | $378.99/mo | 50 | 500 | 50 MB |

Limits live in a single source of truth: `src/lib/plans.ts`.


## Languages

UI copy lives in `src/lib/i18n/dictionaries/*.ts`. The active locale is stored in the
`examcoach_locale` cookie (and on the user row when signed in) and is passed to Gemini so
flashcards, mock exams and Feynman feedback are generated in the learner's language.
Supported languages: English, Ndebele, Shona, French, Spanish, Portuguese, Arabic, Mandarin, Swahili.

## Quick Start (Local)

```bash
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, etc.

npm install
npx prisma db push
node scripts/generate-icons.js
npm run dev
```

Checks:

```bash
npm run lint
npm run typecheck
npm run build
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Render

1. Push this repo to GitHub
2. Create a new **Blueprint** from `render.yaml`
3. Set environment variables in Render dashboard:
   - `GEMINI_API_KEY`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_ENV` (defaults to `live`, set to `sandbox` for testing)
   - `PAYPAL_PLAN_INDIVIDUAL`, `PAYPAL_PLAN_FAMILY`, etc.
   - `BLOB_READ_WRITE_TOKEN` (optional, for file storage)
   - `ADMIN_EMAIL` (grants admin role on login)
4. Render auto-provisions PostgreSQL and runs migrations on deploy

## Admin Access

Set `ADMIN_EMAIL` in environment variables. That user gets `role: admin` and can access `/admin`.

## Tech Stack

- Next.js 14 (App Router)
- NextAuth.js
- Prisma + PostgreSQL
- Google Gemini AI (Native document parsing & reasoning)
- PayPal Subscriptions
- Tailwind CSS
- PWA via @ducanh2912/next-pwa

## Copyright

© 2026 Axiom Neural Systems by Silethemba. All rights reserved.
