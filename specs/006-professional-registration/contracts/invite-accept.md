# Contract: Invite Accept (public page + Server Action)

Unlike the JSON APIs, acceptance is a **server-rendered page + Server Action** (redirect-driven,
non-interactive mutation), consistent with `app/actions/workspace.ts`. The route lives under the
`(workspace)` group — NOT `/dashboard` — so it is reachable while logged out (FR-007).

## Page: `GET /convite/[token]`

`app/(workspace)/convite/[token]/page.tsx` (Server Component). Resolves the token server-side and
renders one of:

| Token state | Session state | Render / redirect |
|-------------|---------------|-------------------|
| invalid / `CANCELLED` / `ACCEPTED` / expired | any | pt-BR "convite inválido/expirado" card; no action (SC-003) |
| valid `PENDING` | logged in **as the invite e-mail's user** | "Aceitar convite" card → `acceptInvite` Server Action |
| valid `PENDING` | logged out, **user exists** for e-mail | redirect `/login?callbackUrl=/convite/<token>` |
| valid `PENDING` | logged out, **no user** for e-mail | redirect `/signup?invite=<token>` (e-mail prefilled) |
| valid `PENDING` | logged in as a **different** user | pt-BR notice to log in with the invited e-mail |

Token validity = `status PENDING` AND `expiresAt >= now`. Expired-but-`PENDING` is opportunistically
flipped to `EXPIRED`.

## Server Action: `acceptInvite(token)`

`app/actions/invite.ts`. Re-validates the token server-side (never trusts client state):

1. Load invite by `tokenHash`; ensure `PENDING` + not expired (else redirect to the invalid
   state).
2. Resolve/await the session; the acting user's e-mail must match the invite e-mail.
3. In a transaction: find-or-create an **ACTIVE** `WorkspaceMembership` for `(user, workspace)`
   with the invited `role` + `jobTitle`; if the user was newly registered via the invite, set
   `User.emailVerified = now` (tokenized link = e-mail proof, `research.md` §2); set invite
   `status = ACCEPTED`, `acceptedAt = now`. Idempotent if a membership already exists.
4. `unstable_update({ user: { activeWorkspaceId: workspaceId } })`, then `redirect("/dashboard")`
   (FR-006/FR-007, US1-S4, SC-002).

## Signup carry-through

`app/(auth)/signup` accepts `?invite=<token>`: the e-mail is prefilled (and locked to the invite
e-mail), and on successful account creation the flow invokes `acceptInvite(token)` instead of the
standard verify-email detour — so the invited new user lands in the workspace on first login with
no extra manual step (SC-002).

## Guarantees

- Tenant/workspace is derived from the **validated token**, never from a client-supplied id
  (Constitution I/VIII).
- Expired/cancelled/already-accepted tokens never grant access (FR-003, SC-003).
- The flow is idempotent and safe against double-clicks (covers the "already a member" edge).
