# Phase 0 Research: Cadastro e Gestão de Profissionais

This document resolves the open technical decisions for the professionals feature. Each entry
follows: **Decision / Rationale / Alternatives considered**.

## 1. Invite token model and lifecycle

**Decision**: Introduce a dedicated `WorkspaceInvite` model with a `tokenHash` column, mirroring
the existing `lib/auth/verification-token.ts` pattern: generate `randomBytes(32).toString("hex")`
as the raw token, store only its `sha256` hash, and put the raw token in the e-mail link. Status
is an explicit enum `InviteStatus { PENDING, ACCEPTED, EXPIRED, CANCELLED }` with `expiresAt =
now + 7 days`. Expiry is enforced at **read/accept time** (treat `PENDING` with `expiresAt < now`
as expired) rather than relying on a background job; an opportunistic status flip to `EXPIRED`
happens when such an invite is read. Resend (FR-005) cancels the previous active invite for that
`(workspaceId, email)` and creates a fresh row with a new token and reset expiry. Re-inviting an
already-pending/expired invite is the same resend path (edge case in spec).

**Rationale**: The repo already hashes single-use tokens this way (sha256 + delete-on-consume),
so reusing the pattern keeps one mental model and avoids leaking usable tokens via the DB.
Lazy expiry avoids adding a scheduler/cron to the stack for a 7-day window where SC-003 only
requires the link to stop working — a runtime check fully satisfies that. A distinct invite row
(vs. reusing `VerificationToken`) is needed because invites carry role + jobTitle + workspace +
status, which `VerificationToken` can't express.

**Alternatives considered**: (a) Reuse `VerificationToken` with encoded metadata — rejected: no
place for role/jobTitle/workspace/status and no resend/cancel semantics. (b) Store the raw token —
rejected: a DB read would expose working invite links. (c) A cron job to expire invites —
rejected: unnecessary infra for a requirement a read-time check already meets.

## 2. Invite acceptance: existing user vs. new user (FR-006/FR-007, SC-002)

**Decision**: The e-mail link points to a **public** page `app/(workspace)/convite/[token]/page.tsx`
(under `(workspace)`, NOT `/dashboard`, so it is reachable while logged out — `auth.config.ts`
only gates `/dashboard`). The page validates the token server-side and branches:

- **Token invalid/expired/cancelled/accepted** → render a clear pt-BR state ("convite expirado/
  inválido"); no action offered.
- **Valid + a `User` with the invite's e-mail already exists**:
  - If logged in as that user → render an "Aceitar convite" button wired to the `acceptInvite`
    Server Action (creates an `ACTIVE` membership with the invited role + jobTitle, marks invite
    `ACCEPTED`, sets `activeWorkspaceId` via `unstable_update`, redirects to `/dashboard`).
  - If logged out (or logged in as a different account) → redirect to
    `/login?callbackUrl=/convite/<token>`; after login the page re-renders the accept button.
- **Valid + no `User` with that e-mail yet** → redirect to `/signup?invite=<token>` with the
  e-mail prefilled/locked. On successful signup, the invite token is carried through and
  `acceptInvite` is invoked: it creates the membership AND sets `emailVerified = now` (the
  tokenized link is itself proof of e-mail ownership), so the new user can log in and immediately
  sees the workspace (US1-S4, SC-002) without the normal separate e-mail-verification step.

`acceptInvite` is idempotent: if a membership already exists it just marks the invite accepted and
activates the workspace (covers double-clicks and the "already a member" edge).

**Rationale**: This is the only flow that satisfies SC-002 ("no manual step after login"). Binding
e-mail verification to invite acceptance is safe because the invite was delivered to that exact
e-mail, the same trust basis the existing verification flow uses. Keeping the route outside
`/dashboard` is required so an unauthenticated invitee isn't bounced to login before we can read
the token and route them to signup.

**Alternatives considered**: (a) A Route Handler (like `verify-email`) instead of a page —
rejected: acceptance needs an interactive, server-rendered screen (show invite details, an accept
button, branch to signup), not a fire-and-redirect GET. (b) Requiring the standard verify-email
step for invited new users — rejected: adds a manual step that breaks SC-002. (c) Auto-accepting
on link click without a confirmation screen — rejected: less clear UX and risks accidental joins;
an explicit accept screen is friendlier and lets us show which workspace/role.

## 3. Profile photo storage (FR-015/FR-016/FR-017, US3 — P3)

**Decision**: Store avatars in a **Supabase Storage** public bucket named `avatars` and persist
the resulting public URL on the existing **global** `User.image` column (the spec states the photo
is global to the user, not per-workspace). Add `@supabase/supabase-js` and a **server-only**
client (`lib/supabase/storage.ts`) created with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
(server env, never `NEXT_PUBLIC_*`). Upload happens through a Route Handler
(`POST /api/workspace/members/[membershipId]/photo`) that receives multipart form data, validates
MIME (`image/jpeg`, `image/png`) and size (≤5 MB) server-side, authorizes the caller (the member
themselves OR an ADMIN/OWNER of the active workspace), uploads to `avatars/<userId>.<ext>` with
`upsert: true`, and updates `User.image`. Missing photos render an initials avatar (shadcn
`Avatar` + `AvatarFallback`) — no file needed.

**Rationale**: Supabase already hosts the database (Constitution stack), so its Storage is the
lowest-friction durable blob store; no new vendor. A server-side Route Handler upload keeps the
service-role key off the client (Constitution V) and lets us enforce type/size/authorization at
the trust boundary (Constitution III) rather than trusting a client-side widget. Storing the
public URL on `User.image` reuses the column NextAuth/Google already populate, so existing avatar
rendering "just works".

**Alternatives considered**: (a) Client-direct upload with a signed URL — rejected for P3: more
moving parts and harder to enforce size/type centrally; revisit only if upload latency matters.
(b) Storing the image as bytes in Postgres — rejected: bloats the DB and the row, poor for CDN
delivery. (c) A third-party (S3/Cloudinary/UploadThing) — rejected: adds a vendor when Supabase
Storage is already available. Because this is P3, photo upload is isolated behind its own handler/
component and can be implemented/validated last without blocking P1–P2.

## 4. React Query provider (first client-side server-data in the app)

**Decision**: Add `app/providers.tsx` — a `"use client"` component that instantiates a single
`QueryClient` (memoized in `useState`) and wraps children in `QueryClientProvider` — and mount it
in `app/layout.tsx` around `{children}`. The professionals screen is a Server Component that
fetches the initial members/invites lists and passes them to the client `ProfessionalsView` as
React Query `initialData`, so the first paint is server-rendered (Constitution II) while
subsequent mutations + revalidation are React Query's job (Constitution VII). Mutations call the
new Route Handlers and invalidate the relevant query keys (`["members"]`, `["invites"]`) for
SC-004 (no manual reload).

**Rationale**: Constitution VII mandates React Query for all client-side server-data
fetching/mutations; this is the first feature that genuinely needs client interactivity over
server data (inline role/status edits, invite create/resend/cancel, photo upload). The
provider must exist before any hook can run. `initialData` from a Server Component keeps initial
data server-first instead of a client `useEffect` fetch.

**Alternatives considered**: (a) Pure Server Actions + `revalidatePath` and no React Query —
rejected: Constitution VII explicitly requires React Query for client-side mutations of server
data, and inline editing benefits from optimistic/cached state. (b) Client-only fetch (no
`initialData`) — rejected: violates Constitution II (initial data must be server-rendered).
Note: the invite-accept flow stays on **Server Actions** (it's a redirect-driven, non-interactive
mutation), consistent with the existing `app/actions/workspace.ts` pattern.

## 5. Authorization & role rules (FR-008..FR-014)

**Decision**: Centralize all role/permission logic in `lib/workspace/authorization.ts`
(`requireWorkspaceRole(userId, workspaceId, allowedRoles)` → returns the caller's membership or
throws a typed 401/403) and `lib/workspace/member-service.ts` (the mutation guards). Every
professional Route Handler: (1) resolves the session, (2) reads `workspaceId` from
`session.user.activeWorkspaceId` (never the body), (3) calls `requireWorkspaceRole`, then (4)
applies the specific rule. Encoded rules:

- Invite with role ADMIN/OWNER requires the **caller** to be OWNER (FR-009); MEMBER invites
  allowed for OWNER+ADMIN.
- ADMIN may not change role/status of an OWNER membership (FR-010/FR-014); the handler rejects
  with 403 + pt-BR message.
- The **last OWNER** of a workspace cannot be demoted or deactivated (FR-011) — `member-service`
  counts active OWNER memberships in the workspace and blocks the operation if it would reach 0.
- Inactive memberships are excluded from `resolveWorkspaceRoute` and the workspace-selection list
  (FR-013/FR-022) — update the existing service to filter `status = ACTIVE`.

**Rationale**: Putting these in services (not handlers or JSX) keeps them independently testable
and reusable across the invite path, the member-update path, and the workspace-route resolver
(Constitution VII). Re-deriving `workspaceId` from the session is the core tenant-isolation
guarantee (Constitution I/VIII).

**Alternatives considered**: (a) Enforce rules client-side by hiding controls — rejected:
client checks are UX only; the server is the access-control boundary (Constitution V/VIII).
(b) Duplicating checks inline per handler — rejected: drift risk and untestable; a shared service
is the standard here.

## 6. Professional ↔ Service relationship now, content later (FR-019, US4)

**Decision**: Create a minimal, forward-compatible `Service` model (workspace-scoped: `id`,
`workspaceId` + index, `name`, `createdAt`) and a `ProfessionalService` join table
(`membershipId`, `serviceId`, unique pair, indexes) **now**, with no UI to create services yet.
The professional profile renders an empty "Serviços" placeholder section (FR-020). When the
services module ships, it extends `Service` with additional columns (additive migration) and adds
the management UI — the professional↔service link already exists, so US4-S2 ("não requer migração
de schema" for the relationship) holds.

**Rationale**: FR-019 explicitly requires the relationship structure to exist now even while
empty. A standalone join keyed by `membershipId` (the per-workspace professional identity) is the
correct grain: services are workspace-scoped and a professional is a per-workspace membership.
Adding fields to `Service` later is additive and non-destructive, satisfying the "no schema
migration for the relationship" intent.

**Alternatives considered**: (a) Skip the tables and add them with the services module —
rejected: violates FR-019/US4-S2. (b) Join on `userId` instead of `membershipId` — rejected:
services belong to a workspace, and the same user can be a professional in multiple workspaces
with different service sets; `membershipId` is the right tenant-scoped grain. (c) A fuller
`Service` schema now (price, duration, etc.) — rejected: that's the services module's design to
own; we keep the placeholder minimal to avoid pre-committing its shape.

## 7. shadcn/ui primitives to add

**Decision**: Add the missing shadcn/ui primitives this screen needs via the shadcn CLI:
`dialog` (invite + edit), `select` (role picker), `dropdown-menu` (row actions), `table` (desktop
list), `avatar` (photo/initials), `sonner` (toasts for mutation success/error), and `switch` (if
used for status). Existing `card`/`input`/`label`/`button`/`badge`/`separator`/`skeleton`/`sheet`/
`tooltip` are reused. All consume existing design tokens; the `frontend-design` skill (Constitution
IV/IX) decides the mobile-first composition (card list on mobile, table on `md:+`) before
implementation.

**Rationale**: Constitution IV forbids hand-rolling primitives that shadcn provides and requires
token-based styling; using the CLI keeps them consistent with the installed components.

**Alternatives considered**: Custom dialog/select/table — rejected by Constitution IV/VIII.

## 8. Next 16 API verification obligations

**Decision**: Before implementation, consult `node_modules/next/dist/docs/01-app/` for the current
Next 16 conventions on: Route Handler signatures and the **async `params`** shape for dynamic
segments (`[membershipId]`, `[inviteId]`, `[token]`), reading multipart `FormData` in a Route
Handler, and `redirect()`/Server Action usage — per AGENTS.md these may differ from training data.

**Rationale**: Constitution II/VIII require checking installed Next docs for unfamiliar or
breaking-change-prone APIs (dynamic route `params` became async in recent Next majors; getting it
wrong silently breaks handlers). The docs are present under `node_modules/next/dist/docs/`.

**Alternatives considered**: Writing from training-data memory — explicitly prohibited
(Constitution VIII).
