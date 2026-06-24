---

description: "Task list for Dashboard Sidebar Navigation Layout"
---

# Tasks: Dashboard Sidebar Navigation Layout

**Input**: Design documents from `/specs/004-dashboard-layout-nav/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md (all present)

**Tests**: Not requested by the spec or constitution (no automated suite mandated). Validation is the manual `quickstart.md` procedure, run in the Polish phase.

**Organization**: Tasks are grouped by user story (US1 = sidebar navigation, US2 = mobile menu, US3 = logout) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact, matching `plan.md`'s Project Structure section

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pull in the shadcn `Sidebar` primitive and lock the visual design before any nav code is written.

- [X] T001 Run `npx shadcn add sidebar` to install `components/ui/sidebar.tsx` and its registry deps (`components/ui/sheet.tsx`, `components/ui/separator.tsx`, `components/ui/tooltip.tsx`, `components/ui/skeleton.tsx`, `hooks/use-mobile.ts`)
- [X] T002 Invoke the `frontend-design` skill for the dashboard nav shell: compose and validate the mobile off-canvas drawer/trigger experience first, then the desktop persistent-sidebar variant (Constitution Principle IX), styled with the existing `--sidebar-*` tokens in `app/globals.css` (Principle IV) (depends on T001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The static Navigation Item config (spec's Key Entity) that the sidebar built in every later story renders.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Create `lib/dashboard/nav-items.ts` exporting `NAV_ITEMS`: an ordered array of `{ label, href, icon, matchExact }` for Painel (`/dashboard`, `LayoutDashboard`, `matchExact: true`), Agenda (`/dashboard/agenda`, `CalendarDays`), Profissionais (`/dashboard/profissionais`, `Users`), Serviços (`/dashboard/servicos`, `Briefcase`), Configurações (`/dashboard/configuracoes`, `Settings`) — pt-BR labels, per `data-model.md` and `research.md` §5

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Navigate the dashboard via the sidebar (Priority: P1) 🎯 MVP

**Goal**: A persistent desktop sidebar shows all five items with icon + label, highlights the active one, and navigates correctly between them and the four new placeholder routes.

**Independent Test**: Log in, land on `/dashboard`, confirm all five items render with a label and distinct icon and Painel is active by default; click each other item and confirm the app navigates to its route and the sidebar updates the active item.

### Implementation for User Story 1

- [X] T004 [P] [US1] Create `app/dashboard/agenda/page.tsx` — minimal pt-BR placeholder Server Component (heading "Agenda" + "em breve" line, no client interactivity)
- [X] T005 [P] [US1] Create `app/dashboard/profissionais/page.tsx` — minimal pt-BR placeholder Server Component (heading "Profissionais" + "em breve" line)
- [X] T006 [P] [US1] Create `app/dashboard/servicos/page.tsx` — minimal pt-BR placeholder Server Component (heading "Serviços" + "em breve" line)
- [X] T007 [P] [US1] Create `app/dashboard/configuracoes/page.tsx` — minimal pt-BR placeholder Server Component (heading "Configurações" + "em breve" line)
- [X] T008 [US1] Create `components/dashboard/app-sidebar.tsx` (`"use client"`) per the T002 design — `Sidebar`/`SidebarHeader`/`SidebarContent`/`SidebarMenu` rendering `NAV_ITEMS` (T003) with icon + label, active state derived from `usePathname()` (exact match for the `matchExact` item, prefix match via `startsWith` for the rest) per `research.md` §2 (depends on T002, T003)
- [X] T009 [US1] Modify `app/dashboard/layout.tsx` to wrap `children` in `<SidebarProvider><AppSidebar /><SidebarInset>{children}</SidebarInset></SidebarProvider>`, leaving the existing `auth()` redirect check unchanged (depends on T008)

**Checkpoint**: User Story 1 is fully functional and independently testable — desktop sidebar navigation, active-state highlighting, and all five routes (including the four new placeholders) work end to end.

---

## Phase 4: User Story 2 - Use the menu on a mobile device (Priority: P2)

**Goal**: On mobile viewports the same five items plus logout are reachable behind an explicit toggle, open in a drawer without horizontal scrolling, and the drawer closes automatically after navigating.

**Independent Test**: Load the dashboard at a mobile viewport width, confirm the persistent sidebar is replaced by a toggle control, open it, confirm all items are visible and usable without horizontal scroll, tap an item, and confirm the drawer closes and the app navigates.

### Implementation for User Story 2

- [X] T010 [US2] Add a `SidebarTrigger` to the mobile header region in `app/dashboard/layout.tsx` (inside `SidebarInset`, per the T002 design) so the toggle control is visible whenever the off-canvas drawer is collapsed (depends on T009)
- [X] T011 [US2] In `components/dashboard/app-sidebar.tsx`, call `useSidebar().setOpenMobile(false)` from each nav item's `onClick` so the drawer closes automatically right after navigating, satisfying the mobile-close acceptance scenario (depends on T008)

**Checkpoint**: User Stories 1 and 2 both work independently — the nav shell now adapts correctly between persistent desktop sidebar and toggle-driven mobile drawer.

---

## Phase 5: User Story 3 - Log out from the dashboard (Priority: P3)

**Goal**: A single, clearly labeled logout control in the sidebar (visible on both desktop and the mobile drawer) ends the session and redirects to `/login`.

**Independent Test**: From any `/dashboard` page, activate the logout control (desktop sidebar or open mobile drawer) and confirm the session ends and the app redirects to `/login`; then confirm a direct visit to `/dashboard` redirects to `/login` instead of rendering content.

### Implementation for User Story 3

- [X] T012 [P] [US3] Add `logOut(): Promise<void>` Server Action to `app/actions/auth.ts` calling the existing `signOut` export from `@/auth` with `{ redirectTo: "/login" }`, per `contracts/server-actions.md`
- [X] T013 [P] [US3] Create `components/dashboard/logout-button.tsx` — `<form action={logOut}>` wrapping a submit button with the `LogOut` icon and the "Sair" label (depends on T012)
- [X] T014 [US3] Render `<LogoutButton />` in a `SidebarFooter` inside `components/dashboard/app-sidebar.tsx`, kept separate from the `NAV_ITEMS` menu per FR-005 (depends on T008, T013)

**Checkpoint**: All three user stories are independently functional — full sidebar nav, mobile drawer, and logout all work together.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories.

- [X] T015 Run the full `quickstart.md` procedure (desktop sidebar, mobile drawer + viewport-resize edge case, narrow-width legibility, logout, and direct-URL route protection while logged out)
- [X] T016 [P] Run `npm run lint` and `tsc --noEmit` and confirm all new/modified files pass with no errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately (T001 → T002)
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories (T003)
- **User Story 1 (Phase 3)**: Depends on Foundational completion only
- **User Story 2 (Phase 4)**: Extends the `AppSidebar`/`layout.tsx` built in User Story 1 (T010 depends on T009, T011 depends on T008) — cannot start before US1's checkpoint
- **User Story 3 (Phase 5)**: The Server Action (T012) has no dependency on US1 and can be built in parallel with US1/US2; wiring it into the sidebar footer (T014) depends on US1's `app-sidebar.tsx` (T008)
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Parallel Opportunities

- T004–T007 (the four placeholder pages) can all run in parallel — different files, no shared dependencies
- T012 and T013 (the logout Server Action and its button component) can be built in parallel with US1 (T004–T009), since neither touches `app-sidebar.tsx` or `layout.tsx`
- T016 (lint/typecheck) can run in parallel with T015 (manual quickstart pass)

---

## Parallel Example: User Story 1

```bash
# Launch all four placeholder pages together:
Task: "Create app/dashboard/agenda/page.tsx pt-BR placeholder"
Task: "Create app/dashboard/profissionais/page.tsx pt-BR placeholder"
Task: "Create app/dashboard/servicos/page.tsx pt-BR placeholder"
Task: "Create app/dashboard/configuracoes/page.tsx pt-BR placeholder"
```

## Parallel Example: User Story 3 (against User Story 1)

```bash
# These can run alongside US1's tasks since they touch different files:
Task: "Add logOut() Server Action to app/actions/auth.ts"
Task: "Create components/dashboard/logout-button.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (shadcn `Sidebar` install + `frontend-design` pass)
2. Complete Phase 2: Foundational (`nav-items.ts`)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart Scenario 1 — desktop sidebar navigation, active state, placeholder routes
5. Deploy/demo if ready — this alone makes the dashboard navigable

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate (Scenario 1) → demo (MVP!)
3. Add User Story 2 → validate (Scenario 2 + resize edge case) → demo
4. Add User Story 3 → validate (Scenario 3 + route-protection edge case) → demo
5. Polish: full quickstart pass + lint/typecheck

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No automated tests requested — `quickstart.md` is the validation artifact
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
