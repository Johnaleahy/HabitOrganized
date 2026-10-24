# Daily Practice

First milestone: guest-first onboarding, email-link sign-in, create a daily habit (5–15 minutes), complete or undo today's check-in, and read it on another device. Responsive Next.js web app with Supabase Auth and Postgres. No mobile installation required for this test.

## Current status

The app is connected to the Supabase project **HabbitsApp** (`pbkkuuimwtdudxujuorl`). The deployed app uses the root Next.js source, exported as static assets at the existing test URL:

https://daily-practice-first-test.team-immedia-9042.chatgpt.site

- Start as a guest. The save-account prompt appears after two habits.
- Email-link sign-in imports guest habits and check-ins with retry-safe upserts.
- Signed-in habits sync across devices. Data refreshes on focus, every 30 seconds, or with the refresh button.
- Both database migrations are applied. Tables enforce per-user row-level security, matching habit/check-in owners, and unique daily check-ins.
- `lib/supabase-public.json` contains only the public URL and publishable browser key. Environment variables can override them. No secret or service-role key is included in the app.
- `prototype/` is the archived browser-only prototype, retained for reference; it is no longer the live build.

**Email testing:** The project currently uses Supabase's default test sender. It sends only to project-team email addresses. Use the email associated with your Supabase account for this test. Configure custom SMTP before inviting the general public; email verification remains enabled.

## Try the local demo

```sh
npm install
npm run dev
```

Open http://localhost:3000. You start directly as a guest, saving in this browser. Sign in to enable cloud saving and cross-device storage. On a phone on the same network, use your computer's LAN address and port 3000.

## Use a different Supabase project

The current project is already configured. For a separate project:

1. Create a Supabase project at https://supabase.com/dashboard.
2. Apply both SQL files in `supabase/migrations/` in filename order, once. They create the tables, row-level security policies, constraints, and indexes. Do not reapply them to the configured project.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project's Connect dialog / API settings. Use the publishable browser key, never a secret or service-role key.
4. In Supabase Authentication → URL Configuration, set Site URL to your deployed origin and add `http://localhost:3000` and your deployed origin to allowed Redirect URLs. For phone testing over LAN, also allow that exact origin. Keep email-link authentication enabled.
5. Restart the dev server after changing environment variables.

The first successful sign-in saves the account's timezone. All devices use it to calculate the daily check-in date. Data refreshes on focus, every 30 seconds while open, and via the refresh button. Completion is confirmed after the server accepts it; failures remain visible and can be retried. Offline writes are not supported yet.

## Deploy

Import this directory into Vercel as a Next.js project and configure the same two public environment variables before building. Set the resulting URL in Supabase URL Configuration. Any standard Next.js hosting platform is also suitable. The configured public project defaults are already included. Supabase Auth allows the existing test origin and localhost. For a different origin, update its Auth Site URL and Redirect URLs before testing email links.

## First cross-device test

1. Open the deployed URL on a computer, tap **Save my habits**, then enter your email and open the sign-in link on that computer.
2. Add **Guitar practice**, **5 minutes**, and complete it.
3. Open the same URL on your phone. Request a new sign-in link with the same email and open it on the phone.
4. Confirm Guitar practice is marked done. Undo it on the phone, then focus or refresh the computer page and confirm it becomes incomplete.
5. Sign in with a different email in a separate browser. Confirm that account cannot see the first account's habits.

## Verification

```sh
npm test
npm run build
```

Calendar tests cover cross-timezone dates and daylight-saving boundaries. Database tests execute the migration in PostgreSQL (PGlite) and verify per-user access, check-in ownership, uniqueness, retry safety, and undo. GitHub Actions runs the tests and production build on pushes and pull requests. Live verification passed with temporary authenticated accounts: separate sessions, saving, retry-safe check-ins, account isolation, rejected forged ownership, synchronized undo, and denied anonymous access. The temporary accounts were signed out and removed. Browser UI and delivery of an actual email still require an end-user check.

## Scope

All habits repeat daily. Editing, archiving, history, timers, reminders, native mobile apps, and offline sync are intentionally deferred until this flow is tested.
