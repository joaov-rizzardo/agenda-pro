# Implementation Plan: User Authentication (Login & Sign Up)

**Branch**: `003-user-authentication` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-user-authentication/spec.md`

## Summary

Implement business-owner sign-up and login on top of the NextAuth (Auth.js v5)
scaffold already wired in `auth.ts` (empty `providers: []`, `PrismaAdapter`
already attached, route handler already re-exporting `handlers`). Add a
**Credentials** provider (email + bcrypt-hashed password) and a **Google**
provider, define the Prisma models the `PrismaAdapter` needs
(`User`/`Account`/`Session`/`VerificationToken`) plus the auth-specific
columns the spec requires (`firstName`, `lastName`, `passwordHash`,
`emailVerified`), and add a custom email-verification flow (token generation
+ Resend-delivered email + a verification Route Handler) since Auth.js's
sign-in is Credentials-based here, not the library's built-in
passwordless/magic-link Email provider.

Because Credentials sign-in only ever issues a JWT session (Auth.js disables
database sessions on that path), the whole app standardizes on
`session: { strategy: "jwt" }`; the Prisma `Session` table stays present only
because the adapter's interface requires the model to exist, not because it
is populated. Google sign-in uses
`allowDangerousEmailAccountLinking: true` gated by a `signIn` callback that
only links/creates when Google reports `profile.email_verified === true`,
which is what satisfies FR-007/FR-008 without trusting an unverified
third-party email.

Route protection follows the Next.js 16 "Proxy" convention (the renamed,
Node.js-runtime-by-default successor to `middleware.ts`): a root `proxy.ts`
does an **optimistic**, cookie/JWT-only redirect for `/dashboard/**` vs.
`/login`/`/signup`, using a edge/runtime-agnostic `auth.config.ts` (providers
+ `callbacks.authorized` only, no Prisma/bcrypt/Resend imports). The actual,
authoritative check — per Next's own Data Access Layer guidance and this
project's Constitution Principle V — happens again, server-side, in the
authenticated layout via the full `auth()` export from `auth.ts`, which is
the only place tenant/user data is ever read.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.9 (App Router), React 19.2.4

**Primary Dependencies**: `next-auth@5.0.0-beta.31` (Credentials + Google
providers) + `@auth/prisma-adapter@2.11.2` (already installed); **new**:
`resend` (transactional email for the verification link) and `bcryptjs`
(pure-JS password hashing — avoids native build steps for a hash function
only ever called from Node-runtime Server Actions/Route Handlers); Zod
(already installed) for sign-up/login input validation.

**Storage**: PostgreSQL via Prisma (existing `prisma/schema.prisma`, zero
models today). This feature adds the first models: `User`, `Account`,
`Session`, `VerificationToken` (Auth.js/PrismaAdapter contract — see
`data-model.md`).

**Testing**: No automated test suite requested by the spec; constitution
only mandates tests "when explicitly requested." Validation is the manual
`quickstart.md` procedure covering all three acceptance-scenario sets
(email/password sign-up + verification, email/password login, Google
sign-up/login/linking).

**Target Platform**: Web browser (business-owner dashboard, authenticated)
+ Node.js server runtime (Server Actions, Route Handlers, Proxy).

**Project Type**: Single Next.js (App Router) web app — this feature adds
the first authenticated area (`/dashboard`) and the first public auth
screens (`/login`, `/signup`) on top of the existing foundation.

**Performance Goals**: Proxy must stay optimistic (cookie/JWT decode only,
no database round-trip) since it runs on every matched request, per
Constitution Principle II and Next's Proxy execution-order guidance.

**Constraints**: Secrets (`AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`) are server-only env vars, never
`NEXT_PUBLIC_*` (Principle V). Generic invalid-credentials messaging (FR-005)
must not leak whether an email is registered. Verification tokens are
single-use and time-limited. No password-recovery flow is built (FR-012,
explicitly out of scope).

**Scale/Scope**: Two public routes (`/login`, `/signup`), one minimal
authenticated route (`/dashboard`, placeholder — the dashboard's real
content is a future feature), one verification Route Handler, two Server
Action modules (sign-up, credentials sign-in wrapper), `auth.config.ts` +
`auth.ts` split, `proxy.ts`, four new Prisma models, one email template.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. Multi-Tenant Isolation | Not yet, forward obligation | This feature creates the `User` (business-owner) identity, not tenant/business rows — there is no tenant table to scope against yet (deferred to a future "business onboarding" feature per spec Assumptions). Nothing here reads/writes tenant-scoped data, so there is no filter to omit. Flagged as a forward obligation for whichever feature adds the `Business`/tenant model: it must FK to `User.id` and be checked server-side from the session, never from client input. |
| II. Server-First Next.js / current API usage | Yes | Verified against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`: `middleware.ts` is deprecated in this Next version, renamed to `proxy.ts`/`export function proxy`, defaults to the Node.js runtime. Sign-up/login forms use Server Actions (`useActionState`) per `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, not client-side `fetch` to an API route. PASS. |
| III. Type-Safe, Validated API Routes | Yes (one Route Handler) | The email-verification confirmation endpoint (`app/api/auth/verify-email/route.ts`) validates its `token`/`email` query params with Zod before any DB write and returns a typed redirect/error — no other new Route Handlers are added (sign-up/login are Server Actions, not Route Handlers, which is the constitution-preferred default whenever no external/non-form client needs the endpoint). |
| IV. Design System & UI Consistency | Yes | `/login` and `/signup` are new screens → the `frontend-design` skill MUST be invoked for their layout before implementation (mobile-first, per Principle IX), reusing existing shadcn primitives (`button`, `card`) and the Check-in Glass tokens from `002-design-system-setup`. Tracked as an explicit task in `tasks.md`, not done in this plan. |
| V. Auth via NextAuth | Yes — this *is* the principle's implementation | Credentials + Google providers, JWT session strategy (required once Credentials is present), `PrismaAdapter` for user/account storage. Proxy performs only the optimistic redirect; the authoritative check is `auth()` inside the authenticated layout (Server Component), per Principle V's "client-side checks are a UX nicety, never the actual access control." Secrets are server-only env vars. |
| VI. Prisma-Mediated DB Access | Yes | First Prisma models added in this feature, ship with a migration in the same change. `lib/prisma.ts` (existing singleton) is the only DB entry point; `auth.config.ts` (used by `proxy.ts`) deliberately does **not** import Prisma, keeping the Proxy DB-free. |
| VII. Component Architecture / Client State | Yes | Sign-up/login forms are Client Components (need `useActionState`/interactivity) calling Server Actions — one component per file. No server data is fetched client-side via `useEffect`; there is no React Query usage here because there is no client-side server-data fetching in this feature (session state comes from NextAuth's own primitives, not a custom API call). |
| VIII. Prohibited Antipatterns | Yes (guard) | Explicitly avoided: no client-supplied tenant ID (none exists yet); no Prisma import into `"use client"` or into `proxy.ts`/`auth.config.ts`; no hardcoded colors/spacing in the new screens (must use existing tokens); no `any`/unnarrowed `unknown` on the Zod-validated Server Action inputs or the verification Route Handler. |
| IX. Mobile-First Development | Yes | `/login` and `/signup` are new screens → mobile viewport composed and verified first in the `frontend-design` invocation, before any wider breakpoint. |

**Result**: PASS. One forward obligation noted under Principle I (no gate
failure — no tenant data exists yet to violate). No Complexity Tracking
entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-user-authentication/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── auth-interface.md # Phase 1 output — Server Action & Route Handler contracts
└── checklists/
    └── requirements.md    # Already produced by /speckit-specify
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma          # MODIFIED: + User, Account, Session, VerificationToken models
                            #   (migration generated alongside, per Constitution Principle VI)

auth.config.ts              # NEW: edge/Proxy-safe config — providers list (Credentials + Google
                             #   definitions, no business logic inline) + callbacks.authorized.
                             #   No Prisma, no bcryptjs, no Resend import.
auth.ts                     # MODIFIED: NextAuth({ ...authConfig, adapter: PrismaAdapter(prisma),
                             #   session: { strategy: "jwt" }, providers: [Credentials(...), Google(...)] })
                             #   — the Credentials authorize() and the Google signIn callback's
                             #   account-linking guard live here (need Prisma + bcryptjs).
proxy.ts                     # NEW: Next 16 Proxy file (replaces middleware.ts convention).
                             #   Optimistic redirect using auth.config.ts's `auth`, matcher
                             #   excludes /api, /_next/static, /_next/image, public assets.

app/
├── (auth)/                  # NEW route group for unauthenticated auth screens
│   ├── login/
│   │   └── page.tsx          # NEW: Server Component shell + <LoginForm /> client component
│   └── signup/
│       └── page.tsx          # NEW: Server Component shell + <SignupForm /> client component
├── dashboard/
│   ├── layout.tsx             # NEW: Server Component — calls auth() (authoritative check,
│   │                          #   not just Proxy), redirects to /login if no session
│   └── page.tsx                # NEW: minimal placeholder (real dashboard is a future feature)
├── actions/
│   └── auth.ts                 # NEW: Server Actions — signUp(state, formData), logIn(state, formData)
│                                #   (logIn wraps next-auth's signIn("credentials", ...))
└── api/
    └── auth/
        ├── [...nextauth]/
        │   └── route.ts          # UNCHANGED — already re-exports handlers
        └── verify-email/
            └── route.ts           # NEW: GET handler — Zod-validates token/email, marks
                                    #   User.emailVerified, deletes the VerificationToken, redirects

components/
├── auth/
│   ├── login-form.tsx          # NEW: "use client" — useActionState(logIn), one component/file
│   ├── signup-form.tsx          # NEW: "use client" — useActionState(signUp)
│   └── google-signin-button.tsx  # NEW: "use client" or a Server Action-bound <form> button
│                                   #   (designed via frontend-design skill, reuses components/ui/button.tsx)
└── ui/                         # UNCHANGED — existing shadcn primitives reused, not duplicated

lib/
├── auth/
│   ├── password.ts              # NEW: hashPassword()/verifyPassword() — thin bcryptjs wrapper,
│   │                             #   isolates the only place bcryptjs is imported (Principle VII:
│   │                             #   logic outside components, single-responsibility module)
│   └── verification-token.ts     # NEW: generate/consume the email-verification token
│                                  #   (wraps the shared VerificationToken Prisma model)
├── email/
│   ├── resend.ts                 # NEW: Resend client singleton (server-only)
│   └── send-verification-email.ts # NEW: builds + sends the verification email
└── validation/
    └── auth.ts                   # NEW: Zod schemas (SignUpSchema, LoginSchema) — shared between
                                    #   the Server Actions and any future client-side mirroring

.env.example                  # MODIFIED: + GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
                               #   RESEND_API_KEY, EMAIL_FROM
```

**Structure Decision**: Single Next.js App Router project (unchanged from
`001-project-foundation-setup` / `002-design-system-setup`). The
`auth.config.ts` / `auth.ts` split is the Auth.js v5-recommended pattern for
keeping the Proxy-loaded config free of Node-only dependencies (Prisma,
bcryptjs, Resend) — even though Next 16's Proxy now defaults to the Node.js
runtime (so this is no longer a hard *compatibility* requirement), it is
kept because it directly produces the "Proxy stays optimistic, no DB calls"
outcome Next's own authentication guide and Constitution Principle II call
for. `app/(auth)/` is a route group (no URL segment) so `/login` and
`/signup` stay top-level paths while sharing nothing layout-wise with
`/dashboard`. New Server Actions live under `app/actions/` (not inlined in
page files) to keep page components reducible to "render the form," per
Constitution Principle VII.

## Complexity Tracking

*No entries — Constitution Check raised no unjustified violations (only the
forward obligation on Principle I, which is informational, not a gate
failure).*
