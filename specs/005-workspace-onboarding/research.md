# Research: Workspace Onboarding & Selection

## 1. Where the active-workspace indicator lives in the session

**Decision**: Store `activeWorkspaceId` inside the NextAuth JWT (`token.activeWorkspaceId`),
exposed to Server Components/Actions via `session.user.activeWorkspaceId`. Augment
`next-auth` and `next-auth/jwt` module types in a new `types/next-auth.d.ts` file.

**Rationale**: `auth.ts` already pins `session: { strategy: "jwt" }` (required because the
Credentials provider is in use). The `Session` table in `prisma/schema.prisma` exists only
for the Auth.js adapter's `Account`/`User` bookkeeping and is not read for session state.
Per Auth.js's own type comments (`node_modules/@auth/core/index.d.ts`), the `jwt` callback
receives a `trigger` of `"signIn" | "signUp" | "update"` and, on `"update"`, a `session`
payload equal to whatever was passed to `unstable_update()` (server) / `useSession().update()`
(client). This lets the active workspace be set at two well-defined points without a
database session table:
- At sign-in time (`trigger === "signIn"`), the `jwt` callback can look up the user's
  workspace memberships directly (it already has `prisma` available in `auth.ts`) and
  auto-populate `activeWorkspaceId` when the user has exactly one membership (FR-008).
  When the user has zero or 2+ memberships, it is left unset, which is what drives the
  onboarding/selection redirects and naturally satisfies the spec's Assumption that
  multi-workspace users see the selection screen on every login (a fresh JWT is minted per
  sign-in, so nothing is "remembered" across logins).
- Later, a Server Action calls the exported `unstable_update({ activeWorkspaceId })`
  (destructured from the `NextAuth(...)` call in `auth.ts`, confirmed available at
  `node_modules/next-auth/index.d.ts:293` and re-exported as `update` from
  `next-auth/lib/actions.d.ts`) after creating a workspace (onboarding) or after the user
  explicitly picks one (selection screen). This triggers the `jwt` callback with
  `trigger === "update"`, which copies `session.activeWorkspaceId` onto the token.

**Alternatives considered**:
- Switching `session.strategy` to `"database"` and storing the active workspace as a column
  on the `Session` row. Rejected: would force re-plumbing the Credentials provider (database
  strategy + Credentials provider is unsupported by Auth.js — Credentials only works with
  JWT sessions) and is a much larger, unjustified change to existing, working auth code.
- A separate cookie for the active workspace, read manually in each route. Rejected: splits
  session truth across two mechanisms (NextAuth JWT + custom cookie), contradicting
  Constitution Principle V ("NextAuth is the single source of truth for session state").

## 2. Where the auth-gate / redirect logic runs (middleware vs. Server Components)

**Decision**: No `middleware.ts` exists in this project (confirmed: only build artifacts
under `.next/`, no source file). The existing convention, used by `app/dashboard/layout.tsx`,
is a Server Component at the top of the protected route tree calling `auth()` and using
`redirect()` from `next/navigation`. This feature follows the same convention: a single
shared resolver function (`resolveWorkspaceRoute`) is called from the `dashboard` layout,
the `onboarding` page, and the `selecionar-workspace` page — each independently redirecting
away if the resolver's decision doesn't match the screen the user is on. This is what makes
FR-013/FR-014 hold even when a user navigates directly to a URL.

**Rationale**: Match existing, working patterns (`AGENTS.md`/Constitution Principle II:
prefer current, in-repo conventions over introducing a new mechanism) rather than inventing
a middleware-based gate that the rest of the app doesn't use.

**Alternatives considered**: Adding `middleware.ts` for a single global gate. Rejected for
this feature — would be a net-new pattern inconsistent with how `/dashboard` is already
protected, and Next's middleware runs on the Edge runtime where the current Prisma/`pg`
adapter setup (`@prisma/adapter-pg`) is not guaranteed to work without further research; not
justified for this feature's scope.

## 3. How Google sign-in and Credentials sign-in both reach the right destination

**Decision**: Both `logIn` and `signInWithGoogle` (in `app/actions/auth.ts`) keep redirecting
to `/dashboard` unconditionally, as they do today. The dashboard layout (and the onboarding /
selection pages) are the single place that runs `resolveWorkspaceRoute` and redirects onward
to `/onboarding` or `/selecionar-workspace` when appropriate.

**Rationale**: `signIn("google", { redirectTo: "/dashboard" })` hands control to Auth.js's
own OAuth callback route, which performs its own HTTP redirect to `redirectTo` — the
`signInWithGoogle` server action does not get a chance to inspect the freshly created
session before that redirect happens. Computing the destination only in the Credentials path
would create two different, divergent ways of deciding where a user lands. Centralizing the
decision in the protected-route entry points avoids that divergence and re-uses the same
function everywhere (DRY, single source of truth for FR-001/FR-013).

**Alternatives considered**: Computing the destination inside `logIn` only (since it doesn't
need the OAuth round-trip) and duplicating equivalent logic in the Google callback handling.
Rejected: duplicate logic that can drift, and unnecessary since the layout-level gate already
has to exist for direct-URL-navigation cases (FR-013) regardless.

## 4. Server Actions vs. Route Handlers for workspace creation/selection

**Decision**: Implement `createWorkspace` and `selectWorkspace` as Server Actions in
`app/actions/workspace.ts`, following the exact pattern already used by `signUp`/`logIn` in
`app/actions/auth.ts` (`"use server"`, Zod validation, `useActionState`-compatible state
shape).

**Rationale**: This is the established, working convention for user-initiated mutations in
this codebase (forms + `useActionState` + Server Actions), and Constitution Principle III's
Route Handler requirements (explicit schema validation, server-side auth/tenant checks,
typed responses) are equally satisfied by Server Actions following the same discipline —
nothing about this feature requires a public/external HTTP contract.

**Alternatives considered**: A `POST /api/workspaces` Route Handler. Rejected: would be the
first Route Handler used for a form-driven mutation in this codebase outside of NextAuth's
own `[...nextauth]` route, breaking from the established Server Action convention without a
concrete need (no external API consumer exists for this feature).

## 5. Role storage

**Decision**: A `WorkspaceRole` Prisma enum (`OWNER`, `ADMIN`, `MEMBER`) on a
`WorkspaceMembership` join model, with a `@@unique([userId, workspaceId])` constraint (one
membership per user per workspace) and indexes on both foreign keys.

**Rationale**: Matches FR-006/FR-007 exactly (any number of workspaces per user, exactly one
role per membership) and Constitution Principle VI's requirement that new tenant-scoped
tables carry an indexed foreign key. `Workspace` itself is the tenant root, not a
tenant-scoped table, so it does not need a tenant FK.

**Alternatives considered**: A plain `String` role column. Rejected: an enum gives
compile-time and database-level exhaustiveness for the fixed owner/admin/member set, with no
added complexity.
