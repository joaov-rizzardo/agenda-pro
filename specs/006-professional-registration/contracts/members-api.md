# Contract: Members API

All handlers: resolve NextAuth session first; if absent → `401`. Tenant `workspaceId` is read
from `session.user.activeWorkspaceId` **server-side** — never from body/query (Constitution I).
Caller membership is verified via `requireWorkspaceRole`. All input validated with Zod before
logic. Responses are typed JSON; errors use `{ error: string }` (pt-BR message) with an
appropriate `4xx`/`5xx` status (Constitution III). No `any` on the boundary.

## `GET /api/workspace/members`

List all memberships (ACTIVE and INACTIVE) of the active workspace.

- **Auth**: any ACTIVE member of the workspace (OWNER/ADMIN/MEMBER) may read the list.
- **200**:
  ```json
  {
    "members": [
      {
        "membershipId": "ckx...",
        "userId": "cku...",
        "firstName": "Ana",
        "lastName": "Souza",
        "email": "ana@ex.com",
        "image": "https://.../avatars/cku.png",
        "role": "ADMIN",
        "status": "ACTIVE",
        "jobTitle": "Cabeleireira",
        "createdAt": "2026-06-29T12:00:00.000Z"
      }
    ]
  }
  ```
- **401** unauthenticated; **403** caller not a member of the active workspace.

## `PATCH /api/workspace/members/[membershipId]`

Update a member's `role`, `status`, and/or `jobTitle`. The target `membershipId` is re-scoped to
the active workspace (a membership in another workspace → `404`, never edited).

- **Auth**: caller must be OWNER or ADMIN of the active workspace.
- **Body** (`UpdateMemberSchema`, ≥1 field): `{ "role"?: "OWNER"|"ADMIN"|"MEMBER",
  "status"?: "ACTIVE"|"INACTIVE", "jobTitle"?: string }`.
- **Server rules** (enforced in `member-service`, return `403` + pt-BR message on violation):
  - ADMIN may not modify a target whose role is OWNER (FR-010/FR-014).
  - Only OWNER may set a target's role to OWNER or ADMIN (FR-009 parity for edits).
  - Demoting or deactivating the **last ACTIVE OWNER** is blocked (FR-011).
- **200**: `{ "member": { ...updated member shape as above } }`.
- **400** invalid body; **403** rule violation / insufficient role; **404** membership not in
  active workspace; **401** unauthenticated.

## Notes

- `membershipId` (and other dynamic segment params) is read via the Next 16 async `params`
  convention — verify signature against `node_modules/next/dist/docs/01-app/` before coding.
- Mutations invalidate the client `["members"]` (and `["invites"]` when relevant) React Query
  keys so the list reflects changes without manual reload (SC-004).
