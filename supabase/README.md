# Database setup

## Hosted project

The migration in `migrations/202610160001_initial.sql` creates profiles, habits,
and daily check-ins. All tables enforce row-level security. Users can access
only their own records. Check-ins must reference a habit owned by the same user,
and one habit can have only one check-in per local date.

Once the Supabase integration is connected, select the intended project, inspect
its existing schema, and apply the migration there. Do not run it blindly against
a project with existing tables of the same names. For a fresh project, the SQL can
also be run once in its SQL Editor. Applying the migration is required: public
project credentials alone cannot create or migrate tables.

In Authentication → URL Configuration, use the deployed app origin as Site URL
and allow it as a redirect URL. The current test origin is:

`https://daily-practice-first-test.team-immedia-9042.chatgpt.site`

The published test must also be upgraded to use the Supabase-backed app before
sign-in works there. The root app's public configuration is documented in
`../.env.example`. Never put a database password, secret key, service-role key,
or Supabase personal access token in browser code or Git.

## Verification

`npm test` executes the actual migration in a temporary PostgreSQL instance
provided by PGlite. It verifies account isolation, rejected forged ownership,
matching habit/check-in owners, daily uniqueness, retries, undo, and anonymous
access denial. The harness supplies the Supabase auth schema and identity
function; hosted Auth, email delivery, and cross-device behavior still need a
connected project for end-to-end testing.
