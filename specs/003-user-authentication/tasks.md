---

description: "Task list for User Authentication (Login & Sign Up)"
---

# Tasks: User Authentication (Login & Sign Up)

**Input**: Design documents from `/specs/003-user-authentication/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-interface.md (all present)

**Tests**: Not requested by the spec or constitution (no automated suite mandated). Validation is the manual `quickstart.md` procedure, run in the Polish phase.

**Organization**: Tasks are grouped by user story (US1 = sign up, US2 = log in, US3 = Google) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact, matching `plan.md`'s Project Structure section

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pull in the new dependencies this feature needs before any code references them.

- [X] T001 Add `resend` and `bcryptjs` (+ `@types/bcryptjs`) to `package.json` and install them
- [X] T002 [P] Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` placeholders to `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth plumbing every user story builds on — schema, password hashing primitive, the edge-safe config split, and the Proxy/JWT session setup mandated by Constitution Principles II/V/VI and `research.md` §1–§2.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `User`, `Account`, `Session`, `VerificationToken` models to `prisma/schema.prisma` per `data-model.md` (fields, `@unique`/`@@unique` constraints, `onDelete: Cascade` FKs)
- [X] T004 Run `npx prisma migrate dev` to generate and apply the migration for the new models (depends on T003)
- [X] T005 [P] Create `lib/auth/password.ts` with `hashPassword()`/`verifyPassword()` thin `bcryptjs` wrappers (per `research.md` §4)
- [X] T006 [P] Create `auth.config.ts` — edge/Proxy-safe config: Credentials + Google provider definitions (no `authorize()`/business logic inline) plus `callbacks.authorized` for `/dashboard` vs. `/login`/`/signup` redirect logic; no Prisma/bcryptjs/Resend imports
- [X] T007 Create `proxy.ts` at the repository root (Next 16 convention, replaces `middleware.ts` per `research.md` §1) — optimistic cookie/JWT-only redirect using `auth.config.ts`'s `auth`, matcher excludes `/api`, `/_next/static`, `/_next/image`, public assets (depends on T006)
- [X] T008 Update `auth.ts` to spread `authConfig`, attach `PrismaAdapter(prisma)`, and set `session: { strategy: "jwt" }` (per `research.md` §2) (depends on T003, T004, T006)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Sign up with email and password (Priority: P1) 🎯 MVP

**Goal**: A visitor submits first name, last name, email, and password; an unverified account is created, a verification email is sent, and clicking the link verifies the account (login itself is User Story 2).

**Independent Test**: Submit the sign-up form with valid data, confirm a new unverified `User` row exists and a verification email was sent (Resend dashboard/inbox), then click the link and confirm `emailVerified` is set.

### Implementation for User Story 1

- [X] T009 [P] [US1] Create `lib/validation/auth.ts` with `SignUpSchema` (Zod): valid email format, minimum password length/complexity, non-empty `firstName`/`lastName` (FR-001, FR-003)
- [X] T010 [P] [US1] Create `lib/email/resend.ts` — server-only Resend client singleton reading `RESEND_API_KEY`
- [X] T011 [P] [US1] Create `lib/auth/verification-token.ts` — generate a random single-use token, store its hash in `VerificationToken` (`identifier` = email, `expires` per chosen window), and a consume function matching the adapter's delete-on-read `useVerificationToken` semantics (depends on T003/T004 schema)
- [X] T012 [US1] Create `lib/email/send-verification-email.ts` — builds the verification link (`/api/auth/verify-email?token=...&email=...`) and sends it via `lib/email/resend.ts` (depends on T010, T011)
- [X] T013 [US1] Create `app/actions/auth.ts` with `signUp(state, formData)` Server Action: validate via `SignUpSchema`, check for an existing `User` by email (FR-002), hash the password (`lib/auth/password.ts`), create the `User` with `emailVerified: null`, generate + send the verification token/email, catch the `User.email` unique-constraint race as the same "email already in use" error (double-submit guard), return the `SignUpState` shape from `contracts/auth-interface.md` (depends on T005, T009, T011, T012)
- [X] T014 [P] [US1] Create `app/api/auth/verify-email/route.ts` — `GET` handler: Zod-validate `token`/`email` query params before any DB call (Constitution Principle III), consume the token, set `User.emailVerified = now()`, redirect to `/login?verified=success` or `/login?verified=error` on missing/invalid/expired token (depends on T011)
- [X] T015 [P] [US1] Invoke the `frontend-design` skill for the `/signup` screen layout (mobile-first per Constitution Principle IX), reusing `components/ui/button.tsx`/`card.tsx` and the Check-in Glass tokens
- [X] T016 [US1] Create `components/auth/signup-form.tsx` (`"use client"`) — `useActionState(signUp, undefined)`-bound form per the design from T015, rendering field errors and the "check your email" success state (depends on T013, T015)
- [X] T017 [US1] Create `app/(auth)/signup/page.tsx` — Server Component shell rendering `<SignupForm />` (depends on T016)

**Checkpoint**: User Story 1 is fully functional and independently testable (sign-up → verification email → link click → verified account).

---

## Phase 4: User Story 2 - Log in with email and password (Priority: P1)

**Goal**: A registered, verified user logs in with email + password and reaches `/dashboard`; wrong password, unknown email, and unverified email all show the same generic message (FR-005).

**Independent Test**: Using a verified account from User Story 1, log out and log back in with the same credentials; confirm dashboard access is restored, and confirm wrong-password/unknown-email/unverified-email all produce the identical generic error text.

### Implementation for User Story 2

- [X] T018 [US2] Add `LoginSchema` (Zod: required `email`, `password`) to `lib/validation/auth.ts` (depends on T009 — same file)
- [X] T019 [P] [US2] Add the Credentials provider's `authorize()` to `auth.ts`: look up `User` by email, return `null` for no-such-user, wrong password (`lib/auth/password.ts`), or `emailVerified === null` — three causes, one generic outcome (FR-005, `research.md` §7) (depends on T008, T005)
- [X] T020 [US2] Add `logIn(state, formData)` Server Action to `app/actions/auth.ts`: validate via `LoginSchema`, call `signIn("credentials", { email, password, redirect: false })`, map the `CredentialsSignin` error to the single generic error string, redirect to `/dashboard` on success (depends on T018, T019)
- [X] T021 [P] [US2] Create `app/dashboard/layout.tsx` — Server Component calling `auth()` (authoritative check, not just Proxy), redirecting to `/login` when there is no session (depends on T008)
- [X] T022 [US2] Create `app/dashboard/page.tsx` — minimal placeholder authenticated content (depends on T021)
- [X] T023 [P] [US2] Invoke the `frontend-design` skill for the `/login` screen layout (mobile-first), reusing the same primitives/tokens as `/signup`
- [X] T024 [US2] Create `components/auth/login-form.tsx` (`"use client"`) — `useActionState(logIn, undefined)`-bound form per the design from T023, rendering the single generic error (depends on T020, T023)
- [X] T025 [US2] Create `app/(auth)/login/page.tsx` — Server Component shell rendering `<LoginForm />` (depends on T024)

**Checkpoint**: User Stories 1 and 2 both work independently — full email/password sign-up-through-login path is functional.

---

## Phase 5: User Story 3 - Sign up or log in with Google (Priority: P2)

**Goal**: A user continues with Google to auto-create (first use) or recognize (return use) an account, linking to an existing email/password account on a shared, Google-verified email instead of duplicating it (FR-006–FR-008).

**Independent Test**: Click "Continue with Google" with a fresh test account → new `User`+`Account` row created, signed in. Repeat with the same account → no duplicate `User`. Use a Google account whose email matches an existing email/password account → linked to that same `User`, not duplicated.

### Implementation for User Story 3

- [X] T026 [P] [US3] Add the Google provider to `auth.config.ts` (edge-safe definition) and the full Google provider (with `allowDangerousEmailAccountLinking: true`) to `auth.ts` (depends on T006, T008)
- [X] T027 [US3] Add a `signIn` callback to `auth.ts` that only allows the Google sign-in to proceed/link when `profile.email_verified === true`, rejecting it otherwise (FR-008, edge case: unverified Google email) (depends on T026)
- [X] T028 [P] [US3] Create `components/auth/google-signin-button.tsx` — a `<form>` bound to a Server Action calling `signIn("google")`, reusing `components/ui/button.tsx`, styled consistent with the `/login`/`/signup` design from T015/T023
- [X] T029 [US3] Add `<GoogleSignInButton />` to `app/(auth)/login/page.tsx` and `app/(auth)/signup/page.tsx` (depends on T017, T025, T028)

**Checkpoint**: All three user stories are independently functional — email/password sign-up, email/password login, and Google sign-up/login/linking.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and a final consistency pass across all three stories.

- [X] T030 Run the full `quickstart.md` validation procedure (Scenarios A–D plus the mobile-viewport check) against the running app
- [X] T031 [P] Review pass: confirm the generic invalid-credentials message (FR-005) is textually identical across all three failure causes, confirm `auth.config.ts`/`proxy.ts` import no Prisma/bcryptjs/Resend, confirm no secret lives in a `NEXT_PUBLIC_*` var

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational; reuses `lib/validation/auth.ts` (T009) and benefits from a verified account existing (T013), but its own Credentials-provider/login code has no hard code dependency on US1's files beyond the shared `User` model
- **User Story 3 (Phase 5)**: Depends on Foundational only; reuses the design conventions from US1/US2 (T015/T023) and wires its button into both pages (T029), but the Google provider/callback logic (T026–T027) has no code dependency on US1/US2
- **Polish (Phase 6)**: Depends on all three stories being complete

### Within Each User Story

- Validation schemas before Server Actions
- Server Actions before the form components that bind to them
- `frontend-design` skill invocation before building the form component it informs
- Story complete (form wired to its page route) before moving to the next priority

### Parallel Opportunities

- T001/T002 (Setup) in parallel
- T005/T006 (Foundational) in parallel once T003/T004 are done
- Within US1: T009, T010, T011, T014, T015 in parallel (different files, no inter-dependencies)
- Within US2: T019, T021, T023 in parallel once Foundational is done
- Within US3: T026, T028 in parallel
- T031 (Polish) can run alongside T030

---

## Parallel Example: User Story 1

```bash
# Launch independent US1 setup tasks together:
Task: "Create lib/validation/auth.ts with SignUpSchema"
Task: "Create lib/email/resend.ts server-only client singleton"
Task: "Create lib/auth/verification-token.ts generate/consume functions"
Task: "Create app/api/auth/verify-email/route.ts GET handler"
Task: "Invoke frontend-design skill for /signup layout"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (sign-up + verification)
4. Complete Phase 4: User Story 2 (login) — together, US1+US2 are the minimum usable product (a user can sign up, verify, and log in)
5. **STOP and VALIDATE**: Run Scenarios A and B from `quickstart.md`
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → verify sign-up/verification independently
3. Add User Story 2 → verify login independently → MVP complete
4. Add User Story 3 → verify Google sign-in/linking independently
5. Polish: full `quickstart.md` run + consistency review

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- `lib/validation/auth.ts` (T009, T018) and `app/actions/auth.ts` (T013, T020) are shared files touched by both US1 and US2 — those specific tasks are sequential, not parallel, despite being in different story phases
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
