---

description: "Task list template for feature implementation"
---

# Tasks: Workspace Onboarding & Selection

**Input**: Design documents from `/specs/005-workspace-onboarding/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/workspace-routing.md](./contracts/workspace-routing.md)

**Tests**: Not requested by the feature spec or Constitution (no automated test suite exists yet). Verification is manual per [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project (App Router) at the repository root — `app/`, `components/`, `lib/`, `prisma/`, `types/`. No frontend/backend split.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema and type groundwork required before any business logic can be written

- [X] T001 Add `WorkspaceRole` enum (`OWNER`, `ADMIN`, `MEMBER`) and the `Workspace`/`WorkspaceMembership` models to `prisma/schema.prisma` per [data-model.md](./data-model.md), including the `@@unique([userId, workspaceId])` constraint, indexes on both FKs, `onDelete: Cascade` on both `WorkspaceMembership` relations, and the new inverse relations (`createdWorkspaces`, `workspaceMemberships`) on the existing `User` model
- [X] T002 Run `npx prisma migrate dev --name add_workspaces` to generate and apply the migration for T001's schema changes
- [X] T003 [P] Create `types/next-auth.d.ts` augmenting `next-auth`'s `Session.user` and `next-auth/jwt`'s `JWT` with `activeWorkspaceId: string | null` per [data-model.md](./data-model.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared routing resolver, session plumbing, and validation schema that every user story's screens and actions depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create `CreateWorkspaceSchema` Zod schema in `lib/validation/workspace.ts` (name: required, trimmed, min 1 non-whitespace char; description: optional, trimmed, empty string normalized to `undefined`) — mirrors the pattern in `lib/validation/auth.ts`
- [X] T005 Create `resolveWorkspaceRoute(userId, activeWorkspaceId)` in `lib/workspace/workspace-service.ts` per [contracts/workspace-routing.md](./contracts/workspace-routing.md): loads the user's `WorkspaceMembership` rows ordered by `createdAt`, and returns `{ type: "onboarding" }` (zero memberships), `{ type: "dashboard", workspaceId }` (exactly one membership, or 2+ with a matching `activeWorkspaceId`), or `{ type: "select-workspace", workspaces }` (2+ memberships, no matching active id) (depends on T002)
- [X] T006 Update `auth.ts`: extend the `jwt` callback so that on `trigger === "signIn" || trigger === "signUp"` it queries the signed-in user's `WorkspaceMembership` count and sets `token.activeWorkspaceId` when exactly one exists (else leaves it unset), and on `trigger === "update"` copies `session.activeWorkspaceId` onto the token; extend the `session` callback to copy `token.activeWorkspaceId` onto `session.user.activeWorkspaceId`; export `unstable_update` alongside the existing `handlers, auth, signIn, signOut` (depends on T002, T003)
- [X] T007 Update `app/dashboard/layout.tsx` to call `resolveWorkspaceRoute(session.user.id, session.user.activeWorkspaceId)` after its existing `auth()` check, and `redirect("/onboarding")` on `"onboarding"` or `redirect("/selecionar-workspace")` on `"select-workspace"`, rendering `children` only on `"dashboard"` (depends on T005)

**Checkpoint**: Foundation ready — routing decisions and session state work end-to-end; user story screens can now be built

---

## Phase 3: User Story 1 - Create first workspace during onboarding (Priority: P1) 🎯 MVP

**Goal**: A zero-workspace user is redirected to `/onboarding`, creates a workspace (name required, description optional), becomes its owner, and lands on the dashboard already connected to it.

**Independent Test**: Log in with a user that has zero `WorkspaceMembership` rows, confirm redirect to `/onboarding` (not `/dashboard`), submit a name (with/without description), confirm a `Workspace` + `WorkspaceMembership(role: OWNER)` row is created and the user lands on `/dashboard` connected to it.

### Implementation for User Story 1

- [X] T008 [US1] Invoke the `frontend-design` skill for the `/onboarding` screen's mobile-first layout and visual direction (Constitution Principle IV/IX gate — required before building the screen below)
- [X] T009 [P] [US1] Create `CreateWorkspaceForm` client component in `components/workspace/create-workspace-form.tsx`: `"use client"`, `useActionState(createWorkspace, undefined)`, name + description fields, pt-BR labels/validation/button text, mirrors `components/auth/login-form.tsx`'s structure (depends on T008)
- [X] T010 [US1] Create `createWorkspace` Server Action in `app/actions/workspace.ts` per [contracts/workspace-routing.md](./contracts/workspace-routing.md): `auth()` → redirect `/login` if none; re-check `resolveWorkspaceRoute` and redirect away if the decision isn't `"onboarding"`; validate `formData` against `CreateWorkspaceSchema` returning `{ errors }` on failure; in a `prisma.$transaction` create the `Workspace` (`createdById`) and its `WorkspaceMembership` (`role: "OWNER"`); catch unexpected DB errors and return `{ error: <pt-BR message> }`; on success call `unstable_update({ activeWorkspaceId: workspace.id })` then `redirect("/dashboard")` (depends on T004, T005, T006)
- [X] T011 [US1] Create `/onboarding` page in `app/(workspace)/onboarding/page.tsx`: Server Component, `auth()` → redirect `/login` if none; call `resolveWorkspaceRoute`; render `CreateWorkspaceForm` inside the Card-based layout from T008 on `"onboarding"`, `redirect("/selecionar-workspace")` on `"select-workspace"`, `redirect("/dashboard")` on `"dashboard"` (FR-014) (depends on T009, T010, T005)

**Checkpoint**: User Story 1 is fully functional and independently testable

---

## Phase 4: User Story 2 - Auto-connect when a user has exactly one workspace (Priority: P1)

**Goal**: A user with exactly one workspace logs in and lands directly on the dashboard, already connected to it, with no extra screen.

**Independent Test**: Log in with a user associated with exactly one workspace; confirm direct landing on `/dashboard` with `session.user.activeWorkspaceId` set to that workspace's id, with no selection screen shown.

**Note**: This story's behavior is fully implemented by Phase 2's `resolveWorkspaceRoute` single-membership branch (T005), the `jwt` callback auto-population (T006), and the dashboard layout's pass-through (T007). No additional source files are needed — this phase only verifies the behavior.

### Implementation for User Story 2

- [X] T012 [US2] Manually verify quickstart.md Scenario 2: log in as a single-workspace user, confirm direct `/dashboard` landing with no intermediate screen and `session.user.activeWorkspaceId` reflecting that workspace (depends on T007)

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Select a workspace when a user belongs to more than one (Priority: P2)

**Goal**: A user with 2+ workspaces sees a selection screen listing all of them, picks one, and lands on the dashboard connected to it; direct dashboard navigation without picking redirects back to the selection screen.

**Independent Test**: Log in with a user associated with 2+ workspaces, confirm the selection screen lists every workspace, pick one, confirm the session's `activeWorkspaceId` updates and the user lands on `/dashboard`; confirm direct `/dashboard` navigation without picking redirects to `/selecionar-workspace`.

### Implementation for User Story 3

- [X] T013 [US3] Invoke the `frontend-design` skill for the `/selecionar-workspace` screen's mobile-first layout and visual direction (Constitution Principle IV/IX gate — required before building the screen below)
- [X] T014 [P] [US3] Create `WorkspaceSelectionList` (and item) component in `components/workspace/workspace-selection-list.tsx`: renders one form per workspace, each posting to `selectWorkspace` with a hidden `workspaceId` field, pt-BR copy (depends on T013)
- [X] T015 [US3] Add `selectWorkspace` Server Action to `app/actions/workspace.ts` per [contracts/workspace-routing.md](./contracts/workspace-routing.md): `auth()` → redirect `/login` if none; read `workspaceId` from `formData`; re-verify a `WorkspaceMembership` exists for `(session.user.id, workspaceId)`, redirecting to `/selecionar-workspace` if not (never trust the posted id); call `unstable_update({ activeWorkspaceId: workspaceId })`; `redirect("/dashboard")` (depends on T005, T006; same file as T010)
- [X] T016 [US3] Create `/selecionar-workspace` page in `app/(workspace)/selecionar-workspace/page.tsx`: Server Component, `auth()` → redirect `/login` if none; call `resolveWorkspaceRoute`; render `WorkspaceSelectionList` with the returned `workspaces` on `"select-workspace"`, `redirect("/onboarding")` on `"onboarding"`, `redirect("/dashboard")` on `"dashboard"` (depends on T014, T015, T005)

**Checkpoint**: All three user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and Constitution gate re-checks across all stories

- [X] T017 [P] Run the full [quickstart.md](./quickstart.md) validation (Scenarios 1, 3, 4) end-to-end against a real dev database, inspecting `Workspace`/`WorkspaceMembership` rows via `npx prisma studio` after each scenario
- [X] T018 [P] Review pt-BR copy across `CreateWorkspaceForm`, `WorkspaceSelectionList`, and both new pages for tone consistency with the existing `(auth)` screens (Constitution Principle X)
- [X] T019 Re-confirm Constitution constraints held: no `middleware.ts` introduced, `session.strategy` remains `"jwt"`, no new client-state library (Zustand/React Query) was introduced for this feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (specifically T002's migration) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion only
- **User Story 2 (Phase 4)**: Depends on Foundational completion only (no new files — verification only)
- **User Story 3 (Phase 5)**: Depends on Foundational completion only; T015 shares `app/actions/workspace.ts` with T010 (US1) but adds a separate exported function, so no edit conflict if done after T010
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3
- **User Story 2 (P1)**: No dependency on US1/US3 — fully covered by Foundational
- **User Story 3 (P2)**: No dependency on US1/US2 for its own logic, though `app/actions/workspace.ts` is a shared file also touched by US1

### Parallel Opportunities

- T003 (types) can run in parallel with T001/T002 within Setup
- T004 (Zod schema) can run in parallel with T005/T006/T007's start within Foundational (no shared file)
- T009 (form component) can run in parallel with T010 (Server Action) within US1 — different files, signatures already fixed by the contract
- T014 (selection list component) can run in parallel with T015 (Server Action) within US3
- T017 and T018 can run in parallel within Polish

---

## Parallel Example: User Story 1

```bash
# After T008 (frontend-design skill invocation) completes:
Task: "Create CreateWorkspaceForm client component in components/workspace/create-workspace-form.tsx"
Task: "Create createWorkspace Server Action in app/actions/workspace.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: a zero-workspace user can create a workspace and reach the dashboard (quickstart Scenario 1)

### Incremental Delivery

1. Setup + Foundational → routing/session foundation ready
2. User Story 1 → brand-new users can onboard (MVP!)
3. User Story 2 → verify the already-built single-membership auto-connect path (no new code)
4. User Story 3 → multi-workspace users get a selection screen
5. Polish → full quickstart validation + Constitution gate re-checks

---

## Notes

- [P] tasks = different files, no blocking dependency
- [Story] label maps task to specific user story for traceability
- No automated tests in this repo yet and none requested by the spec — verification is manual per quickstart.md
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
