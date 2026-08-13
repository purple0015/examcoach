# ExamCoach PWA

AI-powered study companion by **Axiom Neural Systems** (Silethemba).

## Features

- **Landing page** with greeting and proceed flow
- **Auth** — email/password signup + Google OAuth
- **7-day free trial** — auto-assigned on signup
- **Subscription plans** — Individual, Family, School, Ministry, NGO
- **Dashboard** — streaks, goals, weakness heatmap, quick actions
- **Study tools** — AI flashcards, mock exams, Feynman coach
- **Upload** — plan-based daily upload limits
- **Admin dashboard** — users, plans, system stats
- **PWA** — installable, offline-capable

## Subscription Plans

| Plan | Price | Seats | Daily Uploads |
|------|-------|-------|---------------|
| 7-Day Free Trial | Free | 1 | 2 |
| Individual | $9.99/mo | 1 | Unlimited |
| Family | $19.99/mo | 5 | Unlimited |
| School | $99.99/mo | 100 | Unlimited |
| Ministry | $299.99/mo | 500 | Unlimited |
| NGO | $49.99/mo | 50 | Unlimited |

## Quick Start (Local)

```bash
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, etc.

npm install
npx prisma db push
node scripts/generate-icons.js
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Render

1. Push this repo to GitHub
2. Create a new **Blueprint** from `render.yaml`
3. Set environment variables in Render dashboard:
   - `GEMINI_API_KEY`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
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
- Google Gemini AI
- PayPal Subscriptions
- Tailwind CSS
- PWA via @ducanh2912/next-pwa

## Copyright

© 2026 Axiom Neural Systems by Silethemba. All rights reserved.
