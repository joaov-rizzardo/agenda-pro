# Quickstart: Workspace Onboarding & Selection

## Prerequisites

- `DATABASE_URL` pointed at a reachable Postgres (Supabase) instance.
- Migration applied: `npx prisma migrate dev` (after the `Workspace`/`WorkspaceMembership`
  models + `WorkspaceRole` enum are added to `prisma/schema.prisma`).
- Dev server running: `npm run dev`.
- At least one existing user account (sign up via `/signup`, verify the email, or use Google
  sign-in).

## Scenario 1 — Brand-new user reaches onboarding and creates a workspace (US1)

1. Sign up a new account (or use one with zero `WorkspaceMembership` rows — check with
   `npx prisma studio` if unsure).
2. Log in at `/login`.
3. **Expected**: redirected to `/onboarding`, not `/dashboard`.
4. Submit the form with an empty name. **Expected**: validation error shown, no workspace
   created (`npx prisma studio` → `Workspace` table unchanged).
5. Submit the form with a name only (no description). **Expected**: redirected to
   `/dashboard`; a `Workspace` row exists with that name and `description: null`; a
   `WorkspaceMembership` row exists for this user with `role: OWNER`.
6. Navigate directly to `/onboarding` again while logged in. **Expected**: redirected away
   (to `/dashboard`, since this user now has exactly one workspace) — confirms FR-014.

## Scenario 2 — Single-workspace user auto-connects (US2)

1. Log out, then log back in as the same user from Scenario 1 (who now has exactly one
   workspace).
2. **Expected**: lands directly on `/dashboard`, no intermediate screen, and the dashboard
   reflects that workspace as active (e.g. via a debug log of
   `session.user.activeWorkspaceId`, or by temporarily rendering it on the dashboard page).

## Scenario 3 — Multi-workspace user sees the selection screen (US3)

1. Using `npx prisma studio` (or a one-off script), give the Scenario-1 user a second
   `WorkspaceMembership` row pointing at a different `Workspace` (any role).
2. Log out and log back in.
3. **Expected**: redirected to `/selecionar-workspace`, listing both workspaces by name.
4. Pick one. **Expected**: redirected to `/dashboard`, and
   `session.user.activeWorkspaceId` equals the picked workspace's id.
5. While still logged in, navigate directly to `/dashboard` via the URL bar again.
   **Expected**: stays on `/dashboard` (no re-prompt, since the session already has an
   active workspace for this login).
6. Open a fresh session (e.g. a private/incognito window) and log in as the same user again.
   **Expected**: shown `/selecionar-workspace` again — confirms the active workspace is not
   remembered across logins (per spec Assumptions).

## Scenario 4 — Direct navigation without a selection (edge of FR-013)

1. As the multi-workspace user, log in (lands on `/selecionar-workspace` per Scenario 3).
2. Without picking anything, navigate directly to `/dashboard` via the URL bar.
3. **Expected**: redirected back to `/selecionar-workspace` — the dashboard never renders
   without an active workspace.

## Verifying the data model directly

```bash
npx prisma studio
```
Inspect `Workspace` and `WorkspaceMembership` rows after each scenario above to confirm the
`role`, `createdById`, and uniqueness (`userId`+`workspaceId`) constraints hold.
