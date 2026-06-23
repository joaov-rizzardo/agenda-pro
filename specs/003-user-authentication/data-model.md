# Phase 1 Data Model: User Authentication

All four models below are added to `prisma/schema.prisma` in this feature
(currently zero models exist). `User`, `Account`, `Session`, and
`VerificationToken` follow the shape `@auth/prisma-adapter` requires
(verified against `node_modules/@auth/prisma-adapter/src/index.ts`'s calls
to `p.user`, `p.account`, `p.session`, `p.verificationToken`), extended with
the columns this spec's Key Entities section calls for.

## User

Represents a business owner who can log into Agenda Pro (spec's "Account"
entity — named `User` here to match the Auth.js/PrismaAdapter contract,
which hard-codes the model name `user`).

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | Adapter lets Prisma generate the ID (see adapter's `createUser` comment: client-supplied `id` is stripped). |
| `firstName` | `String` | FR-001. |
| `lastName` | `String` | FR-001. |
| `email` | `String @unique` | FR-001, FR-002, FR-005, SC-005 — the single identity key across both sign-in methods. |
| `emailVerified` | `DateTime?` | Null = unverified. Set on successful verification-link click (FR-011) or immediately on first Google sign-in with `email_verified: true` (Google-authenticated accounts are "already verified," per FR-011). Adapter contract calls this field `emailVerified` on `AdapterUser`. |
| `passwordHash` | `String?` | Null for accounts that only ever signed in via Google (no password set) — spec's Key Entities: "password present only for accounts using email/password sign-in." Never the plaintext password (bcryptjs hash only). |
| `image` | `String?` | Adapter-contract field (`AdapterUser.image`); populated from Google's profile picture when available. Not required by this spec's UI but costs nothing to keep for adapter compatibility. |
| `createdAt` | `DateTime @default(now())` | FR's "creation date." |
| `accounts` | `Account[]` | Relation — one user can have multiple linked provider accounts (e.g., one `Account` row for `google`; Credentials sign-in does not create an `Account` row, only a `User` row with `passwordHash` set). |
| `sessions` | `Session[]` | Relation, required by the adapter's interface. Not actually populated at runtime since the app uses JWT sessions (see `research.md` §2) — present only so `PrismaAdapter`'s generic session methods don't fail if ever invoked. |

**Validation rules** (enforced in `lib/validation/auth.ts` via Zod, not at
the DB layer beyond `@unique`):
- `email`: valid email format (FR-003).
- Sign-up password: minimum length + complexity per constitution's "standard
  password complexity rules" assumption (e.g., min 8 chars) — exact policy
  decided at task/implementation time, not a modeling concern.
- `firstName`/`lastName`: non-empty.

**State transitions**:
1. Created via Credentials sign-up → `passwordHash` set, `emailVerified: null`.
2. Verification link clicked → `emailVerified` set to `now()`. No other
   field changes.
3. Created or matched via Google sign-in → `emailVerified` set immediately
   (at creation, or backfilled onto an existing unverified-but-matching
   email row when linking — see `Account` below); `passwordHash` stays
   whatever it was (`null` if the user never set one).

## Account

Auth.js/PrismaAdapter's OAuth-account-linking table (`AdapterAccount`
shape). Only ever populated for Google sign-ins in this feature — Credentials
sign-in never creates a row here (confirmed in `@auth/core`'s callback code:
the `account` object built for the credentials path is synthesized in
memory for the JWT callback only, never persisted via `adapter.linkAccount`).

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | `String` | FK → `User.id`, `onDelete: Cascade`. |
| `type` | `String` | `"oauth"` for Google. |
| `provider` | `String` | `"google"`. |
| `providerAccountId` | `String` | Google's stable subject ID. |
| `refresh_token`, `access_token`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state` | all `String?` / `Int?` as applicable | Standard OAuth token fields the adapter persists; nullable since not all are always returned. |

**Constraint**: `@@unique([provider, providerAccountId])` — matches the
adapter's `getUserByAccount`/`unlinkAccount` lookup key
(`provider_providerAccountId` compound key in the adapter source).

**Relationship to FR-008 (linking)**: when a Google sign-in's email matches
an existing `User.email` that has no `Account` row yet (i.e., was created
via Credentials), the `signIn` callback (see `research.md` §3) allows
`linkAccount` to attach a new `Account` row to that *existing* `userId`
instead of creating a second `User` row — this is what guarantees SC-005
("No two accounts are ever created for the same email address").

## Session

Required by the `PrismaAdapter` interface (`p.session.*` calls exist
regardless of whether they're invoked at runtime).

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `sessionToken` | `String @unique` | |
| `userId` | `String` | FK → `User.id`, `onDelete: Cascade`. |
| `expires` | `DateTime` | |

Not populated in normal operation (JWT session strategy — see
`research.md` §2); modeled solely so the adapter's TypeScript contract and
runtime calls (`p.session.create`, etc.) don't fail if ever exercised
(e.g., a future feature that explicitly opts into database sessions for a
specific flow).

## VerificationToken

Reused, dual-purpose table: the adapter's generic contract
(`createVerificationToken`/`useVerificationToken`) *and* this feature's
custom email-verification-link mechanism (see `research.md` §5).

| Field | Type | Notes |
|---|---|---|
| `identifier` | `String` | The user's email address being verified. |
| `token` | `String` | Random, single-use token (hashed before storage — never the raw value that goes in the email link). |
| `expires` | `DateTime` | Link expiry (e.g., 24h from creation — exact window decided at implementation time; out-of-scope edge case per spec: expired-link *resend* flow is explicitly deferred, FR-012-adjacent). |

**Constraint**: `@@unique([identifier, token])` — matches the adapter's
`identifier_token` compound lookup key, and is what makes
`useVerificationToken` (called by `app/api/auth/verify-email/route.ts`) an
atomic single-use consume operation (delete-on-read, per the adapter's
`useVerificationToken` implementation — returns `null` if already
used/deleted instead of throwing).

**State transition**: created at sign-up time (FR-011) → consumed (deleted)
exactly once when the verification link is clicked, flipping
`User.emailVerified`. A double-click or replay after consumption is a no-op
(adapter returns `null` on the second attempt; the Route Handler treats that
as "already verified or invalid link," never a 500).
