# Data Model: Workspace Onboarding & Selection

## Prisma schema changes (`prisma/schema.prisma`)

### New enum

```prisma
enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
}
```

### New model: `Workspace`

| Field         | Type             | Notes                                              |
|---------------|------------------|-----------------------------------------------------|
| `id`          | `String @id`     | `@default(cuid())`                                  |
| `name`        | `String`         | Required (FR-003). Validated non-blank in app layer |
| `description` | `String?`        | Optional (FR-003)                                   |
| `createdById` | `String`         | FK to `User.id`; who created the workspace           |
| `createdAt`   | `DateTime`       | `@default(now())`                                   |

Relations:
- `createdBy User @relation(fields: [createdById], references: [id])`
- `memberships WorkspaceMembership[]`

`Workspace` is the tenant root entity for this product (Constitution Principle I) — it does
not itself carry a tenant FK; everything else in the system that is workspace-scoped will key
off `Workspace.id` in future features.

### New model: `WorkspaceMembership`

| Field         | Type             | Notes                                              |
|---------------|------------------|-----------------------------------------------------|
| `id`          | `String @id`     | `@default(cuid())`                                  |
| `userId`      | `String`         | FK to `User.id`                                      |
| `workspaceId` | `String`         | FK to `Workspace.id`                                 |
| `role`        | `WorkspaceRole`  | Exactly one of OWNER/ADMIN/MEMBER (FR-007)           |
| `createdAt`   | `DateTime`       | `@default(now())`                                    |

Constraints:
- `@@unique([userId, workspaceId])` — one membership per user per workspace (FR-006/FR-007).
- `@@index([userId])` — used by `resolveWorkspaceRoute` to list a user's memberships.
- `@@index([workspaceId])` — standard FK index (Constitution Principle VI).
- `onDelete: Cascade` on both relations (membership has no meaning without its user or
  workspace).

Relations:
- `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
- `workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)`

### Changes to existing `User` model

Add the inverse relations:
```prisma
createdWorkspaces    Workspace[]
workspaceMemberships WorkspaceMembership[]
```

## Validation rules (application layer, not DB constraints)

- Workspace `name`: required, trimmed, minimum 1 non-whitespace character (FR-004, Edge
  Case "whitespace-only name"). Enforced via a Zod schema (`CreateWorkspaceSchema`) mirroring
  the existing pattern in `lib/validation/auth.ts`.
- Workspace `description`: optional string, trimmed; empty string normalized to `undefined`/
  not stored, no minimum length.
- `WorkspaceMembership.role`: always set to `OWNER` by the system when a user creates a
  workspace through this feature (FR-005) — never accepted as client input for self-creation.

## Active Workspace (session attribute — not a Prisma model)

Not a database row. Implemented as `activeWorkspaceId: string | null` on the NextAuth JWT
(`token.activeWorkspaceId`) and surfaced as `session.user.activeWorkspaceId`. See
`research.md` §1 for why this lives in the JWT rather than a table, and `contracts/` for the
exact read/write points.

Type augmentation required in a new `types/next-auth.d.ts`:

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      activeWorkspaceId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    activeWorkspaceId?: string | null;
  }
}
```

## State transitions for "Active Workspace"

| From                | Trigger                                              | To                          |
|---------------------|-------------------------------------------------------|-----------------------------|
| unset (new sign-in) | User has exactly 1 membership                          | set to that membership's workspaceId (auto, in `jwt` callback) |
| unset (new sign-in) | User has 0 or 2+ memberships                           | stays unset                 |
| unset               | User submits onboarding form successfully (creates ws) | set to the new workspace's id (via `unstable_update`) |
| unset               | User picks a workspace on the selection screen         | set to the picked workspace's id (via `unstable_update`, after re-verifying membership) |
| set (any value)     | User logs out and back in                              | recomputed from scratch per the rules above — never carried over (per spec Assumption: not remembered across logins) |
| set (any value)     | Future "switch workspace" action (out of scope here)   | replaced via the same `unstable_update` mechanism (FR-012) |
