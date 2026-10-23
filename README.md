# Daily Practice

Prepared first milestone: guest-first onboarding, email-link sign-in, create a daily habit (5–15 minutes), complete or undo today's check-in, and read it on another device. Responsive Next.js web app with Supabase Auth and Postgres. No mobile installation required for this test.

## Current status

The phone demo is live at https://daily-practice-first-test.team-immedia-9042.chatgpt.site. It stores habits in the browser and prompts users to save after creating two habits. Account creation in that published demo is not connected yet.

- The root Next.js app contains the Supabase integration and retry-safe guest-habit/check-in import. It still needs a Supabase project configured and live verification.
- `prototype/` preserves the exact source and static assets of the currently published phone demo. It is a separate build; the root app has not replaced the published demo yet.
- The database migration is in `supabase/migrations/`.
- `.env.local`, dependencies, and local build output are excluded from Git. Only public variable names appear in `.env.example`.

## Try the local demo

```sh
npm install
npm run dev
```

Open http://localhost:3000. You start directly as a guest. It saves only to this browser. This is a UI test, not cross-device storage. On a phone on the same network, use your computer's LAN address and port 3000.

## Connect real accounts and storage

1. Create a Supabase project at https://supabase.com/dashboard.
2. Open its SQL Editor and run `supabase/migrations/202610160001_initial.sql` once. It creates the tables, row-level security policies, and duplicate check-in constraint.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project's Connect dialog / API settings. Use the publishable browser key, never a secret or service-role key.
4. In Supabase Authentication → URL Configuration, set Site URL to your deployed origin and add `http://localhost:3000` and your deployed origin to allowed Redirect URLs. For phone testing over LAN, also allow that exact origin. Keep email-link authentication enabled.
5. Restart the dev server after changing environment variables.

The first successful sign-in saves the account's timezone. All devices use it to calculate the daily check-in date. Data refreshes on focus, every 30 seconds while open, and via the refresh button. Completion is confirmed after the server accepts it; failures remain visible and can be retried. Offline writes are not supported yet.

## Deploy

Import this directory into Vercel as a Next.js project and configure the same two public environment variables before building. Set the resulting URL in Supabase URL Configuration. Any standard Next.js hosting platform is also suitable. There is no configured hosting account or Supabase project in this checkout; those steps are needed for the cross-device milestone.

## First cross-device test

1. Open the deployed URL on a computer. Enter your email and open the sign-in link on that computer.
2. Add **Guitar practice**, **5 minutes**, and complete it.
3. Open the same URL on your phone. Request a new sign-in link with the same email and open it on the phone.
4. Confirm Guitar practice is marked done. Undo it on the phone, then focus or refresh the computer page and confirm it becomes incomplete.
5. Sign in with a different email in a separate browser. Confirm that account cannot see the first account's habits.

## Verification

```sh
npm test
npm run build
```

Calendar tests cover cross-timezone dates and daylight-saving boundaries. Database tests execute the migration in PostgreSQL (PGlite) and verify per-user access, check-in ownership, uniqueness, retry safety, and undo. GitHub Actions runs the tests and production build on pushes and pull requests. Hosted Supabase authentication, email delivery, database policy execution, and device synchronization must be checked against a connected project; the local demo cannot verify them.

## Scope

All habits repeat daily. Editing, archiving, history, timers, reminders, native mobile apps, and offline sync are intentionally deferred until this flow is tested.
