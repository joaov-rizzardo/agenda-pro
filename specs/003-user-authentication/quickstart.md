# Quickstart: Validating User Authentication

Manual/visual validation procedure — no automated test suite is requested
by the spec. Run after `/speckit-implement` completes the tasks for this
feature.

## Prerequisites

1. `.env` filled in with (see updated `.env.example`):
   - `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL` (already
     present from `001-project-foundation-setup`).
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from a Google Cloud OAuth
     Client (Web application), authorized redirect URI
     `http://localhost:3000/api/auth/callback/google` for local testing.
   - `RESEND_API_KEY`, `EMAIL_FROM` — from a Resend account/verified sending
     domain (a Resend sandbox/test domain is fine for local validation).
2. `npm install` (pulls in the newly added `resend` and `bcryptjs`).
3. `npx prisma migrate dev` — applies the new `User`/`Account`/`Session`/
   `VerificationToken` migration to the configured Supabase Postgres
   instance.
4. `npm run dev`.

## Scenario A — Email/password sign-up + verification (User Story 1)

1. Visit `/signup`. Submit first name, last name, a unique email, and a
   password meeting the minimum policy.
   - **Expect**: success messaging ("check your email"), no redirect into
     the dashboard (Acceptance Scenario 1 — account is unverified).
2. Check the inbox for the address used (or the Resend dashboard's
   activity log if using a sandbox domain). Open the verification email,
   click the link.
   - **Expect**: redirect to `/login?verified=success` or equivalent
     confirmation.
3. Log in at `/login` with the same email/password.
   - **Expect**: redirected to `/dashboard` (Acceptance Scenario 2).
4. Repeat steps 1 (new email) but log in **before** clicking the
   verification link.
   - **Expect**: generic invalid-credentials-style block, with copy
     indicating email verification is required (Acceptance Scenario 3).
5. Repeat sign-up using an email already registered in step 1.
   - **Expect**: field error on the email field, no second account created
     (Acceptance Scenario 4; confirm via Prisma Studio / a `SELECT` that
     only one `User` row exists for that email).
6. Submit the sign-up form with a malformed email and/or a too-short
   password.
   - **Expect**: field-specific validation errors, no account created
     (Acceptance Scenario 5).

## Scenario B — Email/password login (User Story 2)

1. Using the verified account from Scenario A, log in with the correct
   password → lands on `/dashboard`.
2. Log in with the correct email and a wrong password → generic
   invalid-credentials message, not authenticated.
3. Log in with an email that was never registered → the *same* generic
   message as step 2 (verify it is textually identical — this is the
   FR-005 check, not just "some error").

## Scenario C — Google sign-up/login + account linking (User Story 3)

1. From `/login` or `/signup`, click "Continue with Google" with a Google
   test account that has never been used on this app.
   - **Expect**: Google consent screen → redirected to `/dashboard`,
     authenticated. Confirm in Prisma Studio: one new `User` row
     (`emailVerified` already set, `passwordHash` null) and one `Account`
     row (`provider = "google"`).
2. Log out, click "Continue with Google" again with the same account.
   - **Expect**: signed back in, **no new** `User` row created (same `id`
     as step 1).
3. Sign up via email/password with a fresh email (Scenario A, steps 1–3,
   fully verified). Log out. Click "Continue with Google" using a Google
   account whose email matches that same address.
   - **Expect**: signed in to the *same* `User` row created in step 3 (no
     duplicate `User`), a new `Account` row linked to it. Confirm via
     Prisma Studio: still exactly one `User` row for that email, now with
     both a `passwordHash` and a linked `Account`.
4. Abandon the Google consent screen partway through (deny access or
   navigate away).
   - **Expect**: returned to `/login` or `/signup` with no session and no
     new `User`/`Account` row.

## Scenario D — Route protection (Proxy)

1. While logged out, navigate directly to `/dashboard`.
   - **Expect**: redirected to `/login`, never rendering dashboard content.
2. While logged in, navigate to `/login` or `/signup`.
   - **Expect**: redirected to `/dashboard` (no point showing the auth
     forms to an already-authenticated user).
3. Log out from `/dashboard`.
   - **Expect**: session cleared, redirected to `/login`, and a subsequent
     direct visit to `/dashboard` redirects again (confirms the cookie is
     actually gone, not just client-side state).

## Mobile-viewport check (Constitution Principle IX)

Before considering `/login` and `/signup` complete, resize the browser (or
use device emulation) to a small mobile width (≤ 375px) and confirm: no
horizontal scroll, both forms and the Google sign-in button are fully
usable, touch targets are not cramped. This must be checked in addition to
desktop, not instead of it.
