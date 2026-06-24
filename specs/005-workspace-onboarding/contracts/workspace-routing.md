# Contract: Workspace routing resolver

This is the internal contract every protected entry point relies on. Not an HTTP endpoint —
a server-only function, since this app has no separate frontend/backend split.

## `resolveWorkspaceRoute(userId, activeWorkspaceId)`

Location: `lib/workspace/workspace-service.ts`.

```ts
type WorkspaceRouteDecision =
  | { type: "onboarding" }
  | { type: "select-workspace"; workspaces: WorkspaceOption[] }
  | { type: "dashboard"; workspaceId: string };

type WorkspaceOption = { id: string; name: string; role: WorkspaceRole };

function resolveWorkspaceRoute(
  userId: string,
  activeWorkspaceId: string | null | undefined
): Promise<WorkspaceRouteDecision>;
```

**Behavior**:
1. Load all `WorkspaceMembership` rows for `userId` (with workspace `id`/`name`), ordered by
   `createdAt` ascending.
2. Zero memberships → `{ type: "onboarding" }` (FR-002).
3. Exactly one membership → `{ type: "dashboard", workspaceId: <that membership's workspaceId> }`
   regardless of `activeWorkspaceId` (FR-008 — single-workspace users are never blocked by a
   stale/missing session value; the membership itself is the source of truth when there's
   only one possible choice).
4. Two or more memberships:
   - If `activeWorkspaceId` is set and matches one of the memberships →
     `{ type: "dashboard", workspaceId: activeWorkspaceId }` (FR-010).
   - Otherwise → `{ type: "select-workspace", workspaces: [...] }` (FR-009).

**Callers and what each does with the decision**:

| Caller                                                  | On `"onboarding"`            | On `"select-workspace"`              | On `"dashboard"`                          |
|----------------------------------------------------------|-------------------------------|----------------------------------------|---------------------------------------------|
| `app/dashboard/layout.tsx`                                | `redirect("/onboarding")`     | `redirect("/selecionar-workspace")`    | render children (already on the right place) |
| `app/(workspace)/onboarding/page.tsx`                     | render the create-workspace form | `redirect("/selecionar-workspace")` | `redirect("/dashboard")` (FR-014, US1 AC5)   |
| `app/(workspace)/selecionar-workspace/page.tsx`           | `redirect("/onboarding")`     | render the list of `workspaces`        | `redirect("/dashboard")` (US3 AC3)           |

All three call sites first call `auth()` themselves and `redirect("/login")` if there is no
session, before calling `resolveWorkspaceRoute` — this function assumes an authenticated
`userId` is already known.

## Server Action: `createWorkspace`

Location: `app/actions/workspace.ts`. Mirrors the existing `signUp`/`logIn` shape in
`app/actions/auth.ts` (`useActionState`-compatible).

```ts
type CreateWorkspaceState =
  | undefined
  | { errors: Partial<Record<"name" | "description", string[]>> }
  | { error: string }; // generic/transient failure (Edge Case: retry without losing input)

function createWorkspace(
  state: CreateWorkspaceState,
  formData: FormData
): Promise<CreateWorkspaceState>; // never resolves on success — redirects
```

**Behavior**:
1. `auth()` → if no session, `redirect("/login")`.
2. Re-check via `resolveWorkspaceRoute(session.user.id, session.user.activeWorkspaceId)`; if
   the decision is not `"onboarding"`, `redirect` to the decision's implied destination
   (defends FR-014 against a stale page / direct POST after the user already has a workspace).
3. Validate `formData` against `CreateWorkspaceSchema` (name required/non-blank, description
   optional) → on failure, return `{ errors }` (FR-004).
4. In a single `prisma.$transaction`, create the `Workspace` (`createdById: session.user.id`)
   and its `WorkspaceMembership` (`role: "OWNER"`) (FR-005).
5. On unexpected/transient DB failure, catch and return `{ error: <pt-BR generic message> }`
   instead of throwing, so the user stays on the onboarding screen with their input intact
   (Edge Case: creation failure).
6. On success: `await unstable_update({ activeWorkspaceId: workspace.id })`, then
   `redirect("/dashboard")`.

## Server Action: `selectWorkspace`

Location: `app/actions/workspace.ts`.

```ts
function selectWorkspace(formData: FormData): Promise<void>; // always redirects or no-ops
```

**Behavior**:
1. `auth()` → if no session, `redirect("/login")`.
2. Read `workspaceId` from `formData`. Re-verify a `WorkspaceMembership` exists for
   `(session.user.id, workspaceId)` — never trust the posted id directly (Constitution
   Principle VIII). If no matching membership, `redirect("/selecionar-workspace")` (silently
   re-renders the real list; this path only occurs on tampering, not normal use).
3. `await unstable_update({ activeWorkspaceId: workspaceId })`.
4. `redirect("/dashboard")` (FR-010).

## `auth.ts` changes

- `session: { strategy: "jwt" }` stays as-is.
- `jwt` callback (new): on `trigger === "signIn" || trigger === "signUp"`, query
  `WorkspaceMembership` for the signed-in user; if exactly one, set
  `token.activeWorkspaceId` to it, else leave unset. On `trigger === "update"`, copy
  `session.activeWorkspaceId` (passed by `unstable_update`) onto the token.
- `session` callback (new/extended): copy `token.activeWorkspaceId` onto
  `session.user.activeWorkspaceId`.
- Export `unstable_update` alongside the existing `handlers, auth, signIn, signOut`.
