# Contract: Invites API

Shared preconditions identical to Members API: session resolved first (`401` if absent),
`workspaceId` derived from `session.user.activeWorkspaceId` server-side, caller role checked via
`requireWorkspaceRole`, Zod-validated input, typed JSON responses with pt-BR error messages, no
`any`. Invite/lifecycle logic lives in `lib/workspace/invite-service.ts`.

## `GET /api/workspace/invites`

List invites for the active workspace (default: `PENDING` + `EXPIRED`; accepted/cancelled may be
filtered out or included via `?status=`).

- **Auth**: OWNER or ADMIN of the active workspace.
- **200**:
  ```json
  {
    "invites": [
      {
        "id": "cki...",
        "email": "novo@ex.com",
        "name": "Novo Profissional",
        "role": "MEMBER",
        "jobTitle": "Recepção",
        "status": "PENDING",
        "expiresAt": "2026-07-06T12:00:00.000Z",
        "createdAt": "2026-06-29T12:00:00.000Z"
      }
    ]
  }
  ```
  (Raw token is **never** returned — only delivered by e-mail.)

## `POST /api/workspace/invites`

Create and send an invite (FR-001/FR-002).

- **Auth**: OWNER or ADMIN. **Only OWNER** may invite with `role` ADMIN or OWNER (FR-009) →
  otherwise `403`.
- **Body** (`CreateInviteSchema`): `{ "email": string, "name"?: string,
  "role": "OWNER"|"ADMIN"|"MEMBER", "jobTitle"?: string }`.
- **Behavior**: reject if an ACTIVE membership already exists for that e-mail in the workspace
  (`409` + "já é membro", FR-004). Otherwise create a `PENDING` invite with sha256 `tokenHash`,
  `expiresAt = now + 7d`, and send the pt-BR e-mail via Resend with link
  `${AUTH_URL}/convite/<rawToken>`.
- **201**: `{ "invite": { ...invite shape above } }`.
- **400** invalid body; **403** role rule; **409** already a member; **401** unauthenticated.

## `POST /api/workspace/invites/[inviteId]`

Resend a `PENDING` or `EXPIRED` invite (FR-005). Re-scoped to the active workspace.

- **Auth**: OWNER or ADMIN (OWNER required if the invite's role is ADMIN/OWNER).
- **Behavior**: cancel the existing invite row, create a fresh one with a new token + reset
  `expiresAt`, resend the e-mail. (Same path serves the "re-invite a pending invite" edge case.)
- **200**: `{ "invite": { ...new invite shape } }`; **404** invite not in workspace.

## `DELETE /api/workspace/invites/[inviteId]`

Cancel a pending invite. Re-scoped to the active workspace.

- **Auth**: OWNER or ADMIN.
- **Behavior**: set `status = CANCELLED`; the link stops working.
- **200**: `{ "ok": true }`; **404** invite not in workspace.

## Notes

- Token generation/hashing mirrors `lib/auth/verification-token.ts` (`randomBytes(32)` hex,
  sha256 stored). Lazy expiry is computed at read/accept time (`research.md` §1).
- Mutations invalidate the `["invites"]` (and `["members"]` after acceptance) React Query keys.
