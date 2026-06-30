# Phase 1 Data Model: Cadastro e Gestão de Profissionais

Source of truth is `prisma/schema.prisma`; this document describes the additions/changes and the
rules they enforce. All changes ship in a single migration `<ts>_add_professionals`.

## Enums (new)

```prisma
enum MembershipStatus {
  ACTIVE
  INACTIVE
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}
```

`WorkspaceRole { OWNER, ADMIN, MEMBER }` already exists and is reused.

## `WorkspaceMembership` (modified)

New columns on the existing model (the per-workspace professional identity):

| Field      | Type               | Notes |
|------------|--------------------|-------|
| `status`   | `MembershipStatus` | `@default(ACTIVE)`. INACTIVE = no workspace access (FR-012/FR-013). |
| `jobTitle` | `String?`          | Per-workspace job title / "cargo" (FR-018). Independent of other workspaces. |

New relation: `services ProfessionalService[]` (back-relation for the join below).

Existing `@@unique([userId, workspaceId])`, `@@index([userId])`, `@@index([workspaceId])` are
kept. Rules enforced in `lib/workspace/member-service.ts`, not the schema:

- A workspace must always retain ≥1 **ACTIVE OWNER**; demoting/deactivating the last OWNER is
  blocked (FR-011).
- An ADMIN cannot modify an OWNER membership's role or status (FR-010/FR-014).
- Only `status = ACTIVE` memberships are surfaced by `resolveWorkspaceRoute` and the
  workspace-selection list (FR-013/FR-022).

## `WorkspaceInvite` (new)

Represents a pending/historical invitation to join a workspace (tenant-scoped).

| Field         | Type           | Notes |
|---------------|----------------|-------|
| `id`          | `String`       | `@id @default(cuid())` |
| `workspaceId` | `String`       | FK → `Workspace`, `@@index`. Tenant scope. |
| `email`       | `String`       | Invitee e-mail (lowercased on write). |
| `name`        | `String?`      | Optional display name captured at invite time (FR-001). |
| `role`        | `WorkspaceRole`| Intended role on acceptance (FR-001). |
| `jobTitle`    | `String?`      | Intended job title on acceptance. |
| `tokenHash`   | `String`       | `@unique`. sha256 of the raw token (raw token only in the e-mail). |
| `status`      | `InviteStatus` | `@default(PENDING)`. |
| `expiresAt`   | `DateTime`     | `now + 7 days` (FR-002). |
| `invitedById` | `String`       | FK → `User` (the OWNER/ADMIN who sent it). |
| `createdAt`   | `DateTime`     | `@default(now())` |
| `acceptedAt`  | `DateTime?`    | Set when accepted. |

Relations: `workspace Workspace @relation(...)`, `invitedBy User @relation("InvitesSent", ...)`.
Indexes: `@@index([workspaceId])`, `@@index([email])`, plus the `@unique` on `tokenHash`.

**Lifecycle / rules** (in `lib/workspace/invite-service.ts`):
- Block creating an invite when an **ACTIVE** membership already exists for that e-mail in the
  workspace (FR-004 / edge case "já é membro").
- Resend cancels the prior `PENDING`/`EXPIRED` invite for `(workspaceId, email)` (set
  `CANCELLED`) and creates a fresh row with new `tokenHash` + reset `expiresAt` (FR-005).
- Read/accept treats `PENDING` + `expiresAt < now` as expired (opportunistically flips to
  `EXPIRED`); accept requires `PENDING` and not expired (FR-003, SC-003).
- Accept → create/find membership (`ACTIVE`, invited role + jobTitle), set `status = ACCEPTED`,
  `acceptedAt = now`; idempotent if membership already exists.

## `Service` (new — minimal placeholder)

Workspace-scoped service offered by the business. Content/management owned by the future services
module; created now only so the professional↔service relationship exists (FR-019).

| Field         | Type       | Notes |
|---------------|------------|-------|
| `id`          | `String`   | `@id @default(cuid())` |
| `workspaceId` | `String`   | FK → `Workspace`, `@@index`. Tenant scope (Principle I/VI). |
| `name`        | `String`   | Placeholder; services module will extend this model additively. |
| `createdAt`   | `DateTime` | `@default(now())` |

Relations: `workspace Workspace @relation(...)`, `professionals ProfessionalService[]`. The
services module later adds columns (price, duration, etc.) via an additive migration — no
destructive change to this link (US4-S2).

## `ProfessionalService` (new — join table)

Many-to-many between a professional (a `WorkspaceMembership`) and a `Service`.

| Field          | Type     | Notes |
|----------------|----------|-------|
| `id`           | `String` | `@id @default(cuid())` |
| `membershipId` | `String` | FK → `WorkspaceMembership` (`onDelete: Cascade`). |
| `serviceId`    | `String` | FK → `Service` (`onDelete: Cascade`). |
| `createdAt`    | `DateTime` | `@default(now())` |

Constraints: `@@unique([membershipId, serviceId])`, `@@index([membershipId])`,
`@@index([serviceId])`. No rows are created by this feature — the "Serviços" UI section renders an
empty placeholder state (FR-020).

## `User` (unchanged schema, behavior note)

No column change. `User.image` (existing, global) stores the Supabase Storage public URL for the
profile photo (FR-015). `acceptInvite` may set `emailVerified = now` for a newly-registered
invitee (the tokenized link proves e-mail ownership — see `research.md` §2). New back-relation
`invitesSent WorkspaceInvite[] @relation("InvitesSent")`.

## Entity relationship summary

```text
User ─1:N─ WorkspaceMembership ─N:1─ Workspace
User ─1:N─ WorkspaceInvite (InvitesSent) ─N:1─ Workspace
WorkspaceMembership ─1:N─ ProfessionalService ─N:1─ Service ─N:1─ Workspace
```

## Validation (Zod — `lib/validation/professional.ts`)

- **CreateInviteSchema**: `email` (valid e-mail, lowercased), `name` (optional, trimmed),
  `role` (`WorkspaceRole` enum), `jobTitle` (optional, trimmed). pt-BR error messages.
- **UpdateMemberSchema**: partial of `{ role?: WorkspaceRole, status?: MembershipStatus,
  jobTitle?: string }` — at least one field required.
- **Photo upload**: server-side checks `Content-Type ∈ {image/jpeg, image/png}` and size ≤
  5 MB (5 \* 1024 \* 1024 bytes) on the parsed `File` from `FormData` (FR-016) — rejected with a
  typed 422 + pt-BR message (US3-S3).
