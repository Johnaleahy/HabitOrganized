# Database setup

## Hosted project

The migration in `migrations/20261024015753_initial_habit_app_schema.sql` creates profiles, habits,
and daily check-ins. All tables enforce row-level security. Users can access
only their own records. Check-ins must reference a habit owned by the same user,
and one habit can have only one check-in per local date.

The configured HabbitsApp project (`pbkkuuimwtdudxujuorl`) already has both
migrations applied. For another project, inspect its existing schema before
applying these migrations. Do not run it blindly against
a project with existing tables of the same names. For a fresh project, the SQL can
also be run once in its SQL Editor. Applying the migration is required: public
project credentials alone cannot create or migrate tables.

In Authentication → URL Configuration, use the deployed app origin as Site URL
and allow it as a redirect URL. The current test origin is:

`https://daily-practice-first-test.team-immedia-9042.chatgpt.site`

The published test uses the root Supabase-backed app, exported as static assets. The root app's public configuration is documented in
`../.env.example`. Never put a database password, secret key, service-role key,
or Supabase personal access token in browser code or Git.

## Verification

`npm test` executes the actual migration in a temporary PostgreSQL instance
provided by PGlite. It verifies account isolation, rejected forged ownership,
matching habit/check-in owners, daily uniqueness, retries, undo, and anonymous
access denial. The harness supplies the Supabase auth schema and identity
function; hosted Auth, email delivery, and cross-device behavior still need a
connected project for end-to-end testing.

## Email delivery

Site URL and allowed redirects are configured for the existing test origin and
localhost. Email signup is enabled and email verification remains required.
Supabase's built-in sender allows only project-team addresses; configure custom
SMTP before opening signup to the public.

## Live checks

Hosted RLS and constraint assertions passed inside a rolled-back transaction.
Separate real authenticated sessions also passed create/read, retry-safe import,
account isolation, forged-owner rejection, synchronized undo, and anonymous-access
denial. Temporary test accounts were signed out and removed.
