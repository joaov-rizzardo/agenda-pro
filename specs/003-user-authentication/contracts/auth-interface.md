# Contracts: User Authentication

This feature exposes no public/external API. Its interfaces are (a) two
Server Actions invoked from form components, and (b) one Route Handler
invoked only as a browser navigation target (the link inside the
verification email) — documented here for the same reason a REST contract
would be: so the form components and the email template can be built
against a stable signature independent of the implementation.

## Server Action: `signUp`

`app/actions/auth.ts` — `export async function signUp(state: SignUpState, formData: FormData): Promise<SignUpState>`

Bound via `useActionState(signUp, undefined)` in `components/auth/signup-form.tsx`.

**Input** (`formData` fields): `firstName`, `lastName`, `email`, `password`.

**Validated by**: `SignUpSchema` in `lib/validation/auth.ts` (Zod).

**Behavior**:
1. Parse + validate `formData` against `SignUpSchema`. On failure, return
   `{ errors: <field errors> }` (FR-003, Acceptance Scenario 5).
2. Check for an existing `User` with the same `email`. If found, return
   `{ errors: { email: ["..."] } }` (FR-002, Acceptance Scenario 4).
3. Hash the password (`lib/auth/password.ts`), create the `User` row with
   `emailVerified: null`.
4. Generate a verification token (`lib/auth/verification-token.ts`), send
   the verification email (`lib/email/send-verification-email.ts`).
5. Return a success state telling the form to show "check your email"
   messaging (Acceptance Scenario 1) — this action does **not** sign the
   user in (verification gates login, per FR-011).

**Output shape**:
```ts
type SignUpState =
  | undefined
  | { errors: Partial<Record<"firstName" | "lastName" | "email" | "password", string[]>> }
  | { success: true }
```

**Idempotency / double-submit guard** (Edge Case: "double-submit must not
create two accounts"): step 2's existing-email check, combined with the
`User.email` `@unique` constraint as the final backstop (a concurrent
double-submit that both pass the pre-check race to the DB write — the
second write fails the unique constraint and must be caught and treated as
the same "email already in use" error, not a 500).

## Server Action: `logIn`

`app/actions/auth.ts` — `export async function logIn(state: LoginState, formData: FormData): Promise<LoginState>`

Bound via `useActionState(logIn, undefined)` in `components/auth/login-form.tsx`.

**Input**: `email`, `password`.

**Validated by**: `LoginSchema` in `lib/validation/auth.ts`.

**Behavior**:
1. Parse + validate. On failure, return field errors.
2. Call `signIn("credentials", { email, password, redirect: false })`
   (imported from `auth.ts`). The Credentials provider's `authorize()`
   internally re-validates and returns `null` (→ generic
   `CredentialsSignin` error) for: no such user, wrong password, or
   `emailVerified` is null — three different causes, one message (FR-005,
   research.md §7, Acceptance Scenarios 2/3 of User Story 2 and Scenario 3
   of User Story 1).
3. On success, redirect to `/dashboard`. On `CredentialsSignin`, return a
   single generic error string.

**Output shape**:
```ts
type LoginState =
  | undefined
  | { error: string } // always the same generic copy, never field-specific
```

## Server Action (form-bound, no return value): Google sign-in

`components/auth/google-signin-button.tsx` renders a `<form>` whose
`action` is an inline Server Action (or a small exported action) that calls
`signIn("google")` — no custom state, Auth.js handles the OAuth redirect
itself. Account creation/linking happens inside the `signIn` callback in
`auth.ts` (see `research.md` §3), not in this action.

## Route Handler: `GET /api/auth/verify-email`

`app/api/auth/verify-email/route.ts`

**Query params**: `token` (string), `email` (string) — both required.

**Validated by**: a small Zod schema inline (or in `lib/validation/auth.ts`)
before any DB call — Constitution Principle III.

**Behavior**:
1. If `token`/`email` missing or malformed → redirect to
   `/login?verified=error`.
2. Attempt to consume the token (`useVerificationToken`-equivalent lookup
   keyed on `[identifier=email, token]`, hashed-compare against what's
   stored). If not found/expired/already used → redirect to
   `/login?verified=error` (Edge Case: lost/expired link — resend is
   explicitly out of scope this iteration, so the only behavior required
   here is "don't crash, show a clear error").
3. On success: set `User.emailVerified = now()`, delete the consumed token,
   redirect to `/login?verified=success`.

**Response**: always a redirect (`303` or Next's `redirect()`), never a JSON
body — this endpoint is a browser-navigation target (email link click),
not an API consumed by client code.
