# Implementation Plan: Dashboard Sidebar Navigation Layout

**Branch**: `004-dashboard-layout-nav` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-dashboard-layout-nav/spec.md`

## Summary

Build the authenticated dashboard's navigation shell on top of the existing
`/dashboard` route (already protected by `auth()` in `app/dashboard/layout.tsx`
per the `003-user-authentication` feature). The shell is a shadcn/ui `Sidebar`
(persistent on desktop, an off-canvas `Sheet`-backed drawer behind a trigger
on mobile — both behaviors ship for free in the shadcn registry component) with
five static navigation items (Painel, Agenda, Profissionais, Serviços,
Configurações), each with a `lucide-react` icon and active-state highlighting
derived from the current pathname, plus a logout action wired to a new
Server Action that calls the already-exported NextAuth `signOut`. Four of the
five destinations (`Agenda`, `Profissionais`, `Serviços`, `Configurações`) get
minimal pt-BR placeholder pages so their routes resolve; `Painel` is the
existing `app/dashboard/page.tsx`. No new Prisma models, Route Handlers, or
client-side data fetching are introduced — this is a pure navigation/layout
feature.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.9 (App Router), React 19.2.4

**Primary Dependencies**: shadcn/ui `Sidebar` primitive (pulls in `sheet`,
`separator`, `tooltip`, `use-mobile`, `skeleton`, `input` registry deps;
`button` already exists in `components/ui/`) added via the `shadcn` CLI
already in `package.json`; `lucide-react` (already installed) for the five
nav icons + logout icon; `next-auth`'s existing `signOut` export from `auth.ts`
for the logout action.

**Storage**: N/A — no new or changed Prisma models. Navigation items are a
static, in-code configuration, not persisted data.

**Testing**: No automated test suite requested by the spec; constitution only
mandates tests "when explicitly requested." Validation is the manual
`quickstart.md` procedure covering desktop sidebar, mobile drawer, active
state, placeholder routes, and logout/route-protection.

**Target Platform**: Web browser — authenticated dashboard area, all
supported mobile and desktop viewport widths (Principle IX).

**Project Type**: Single Next.js (App Router) web app — extends the existing
`/dashboard` route tree from `003-user-authentication`; no new project root.

**Performance Goals**: N/A beyond standard SSR for the new placeholder pages;
the sidebar itself is a client component but renders static, local data (no
fetch, no loading state).

**Constraints**: All five nav labels, the logout label, and all placeholder
page copy MUST be pt-BR (Principle X / FR-012). Mobile-first composition and
verification before desktop (Principle IX). No custom drawer/sidebar
primitive — must reuse the shadcn `Sidebar`/`Sheet` components rather than
hand-rolling one (Principle IV / VIII). Route protection for all five
destinations is already inherited from `app/dashboard/layout.tsx`'s `auth()`
check (Principle V) — this feature must not weaken or duplicate that check.

**Scale/Scope**: One new client component (`AppSidebar`), one static nav-item
config module, one logout Server Action, four new placeholder route folders,
one modified `app/dashboard/layout.tsx`. Five shadcn component installs
(`sidebar` + its registry deps not already present).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. Multi-Tenant Isolation | No | Pure navigation/layout feature; no tenant-scoped data is read or written. |
| II. Server-First Next.js / current API usage | Yes | Placeholder pages (`Agenda`, `Profissionais`, `Serviços`, `Configurações`, and the existing `Painel`) are plain Server Components — no client fetch. Only the sidebar nav itself is `"use client"` (needs `usePathname` + the shadcn `Sidebar`'s mobile/open state), kept as a single leaf-level boundary per Principle II. Will verify `usePathname`/App Router layout conventions against `node_modules/next/dist/docs/` if anything looks unfamiliar during implementation. |
| III. Type-Safe, Validated API Routes | N/A | No new Route Handler. The only new server entry point is a Server Action (`logOut`) which takes no user input to validate. |
| IV. Design System & UI Consistency (NON-NEGOTIABLE) | Yes | This is new layout work → the `frontend-design` skill MUST be invoked before implementation, covering the sidebar's visual treatment within the existing Check-in Glass tokens (`--sidebar-*` variables already defined in `app/globals.css`). Tracked as the first task in `tasks.md`, not performed in this plan. Uses the shadcn `Sidebar`/`Sheet`/`Separator`/`Tooltip` registry components instead of a custom drawer, per Principle VIII's explicit prohibition on duplicating shadcn equivalents. |
| V. Auth via NextAuth | Yes | Logout reuses the existing `signOut` export from `auth.ts` (no new auth primitive). Route protection is unchanged — already authoritative via `auth()` in `app/dashboard/layout.tsx`; this feature only adds UI on top, per "client-side checks are a UX nicety, never the actual access control." |
| VI. Prisma-Mediated DB Access | N/A | No schema changes. |
| VII. Component Architecture / Client State | Yes | One component per file: `AppSidebar` (nav rendering), `LogoutButton` (form bound to the Server Action) — each its own file. Nav-item data (label/href/icon) lives in a plain config module (`lib/dashboard/nav-items.ts`), not inlined in JSX, satisfying "logic outside presentational components" for what little logic exists here (active-path matching). No React Query (no server-data fetching) and no Zustand (sidebar open/closed state is owned internally by the shadcn `SidebarProvider`, which is exactly the kind of component-local/UI-only state Principle VII excludes from Zustand). |
| VIII. Prohibited Antipatterns | Yes (guard) | Avoided: no custom sidebar/drawer duplicating shadcn's `Sidebar`; no hardcoded colors (reuses `--sidebar-*` tokens); no `useEffect`+`fetch`; no Prisma in client code (none added); `frontend-design` skill not skipped (tracked as a task); English copy not introduced. |
| IX. Mobile-First Development (NON-NEGOTIABLE) | Yes | The `frontend-design` invocation (tracked in `tasks.md`) MUST compose and validate the mobile drawer/trigger experience before the desktop persistent-sidebar variant, per FR-008/FR-009 and the Edge Cases on viewport resize and narrow widths. |
| X. User-Facing Language (pt-BR) (NON-NEGOTIABLE) | Yes | All five nav labels, the logout label, and the four placeholder pages' copy ship in pt-BR from the start (FR-012). |

**Result**: PASS. No Complexity Tracking entries needed — every applicable
principle is satisfied by reusing existing primitives (shadcn `Sidebar`,
existing `auth()`/`signOut`) rather than introducing new ones. Principle IV's
mandatory `frontend-design` skill invocation and Principle IX's mobile-first
validation are explicitly deferred to `tasks.md`/implementation, not this
planning phase, consistent with how `003-user-authentication` handled the
same gate.

## Project Structure

### Documentation (this feature)

```text
specs/004-dashboard-layout-nav/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── server-actions.md # Phase 1 output — logOut Server Action contract
└── tasks.md              # Phase 2 output (/speckit-tasks command — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
components/
├── ui/
│   ├── sidebar.tsx        # NEW: shadcn `Sidebar` primitive (via `npx shadcn add sidebar`)
│   ├── sheet.tsx           # NEW: shadcn registry dep of sidebar (mobile drawer)
│   ├── separator.tsx       # NEW: shadcn registry dep of sidebar
│   ├── tooltip.tsx         # NEW: shadcn registry dep of sidebar
│   ├── skeleton.tsx        # NEW: shadcn registry dep of sidebar
│   └── button.tsx          # UNCHANGED — already has the `icon-sm` size sidebar's trigger needs
└── dashboard/
    ├── app-sidebar.tsx      # NEW: "use client" — renders SidebarProvider/Sidebar/SidebarTrigger,
    │                        #   the 5 nav items (active state via usePathname), one component/file
    └── logout-button.tsx    # NEW: "use client" or server-bound <form> — calls logOut Server Action

lib/
└── dashboard/
    └── nav-items.ts          # NEW: static NavigationItem[] config (label/href/icon), pt-BR labels

hooks/
└── use-mobile.ts             # NEW: shadcn registry dep of sidebar (viewport breakpoint hook)

app/
├── actions/
│   └── auth.ts                # MODIFIED: + logOut() Server Action (calls existing `signOut`)
└── dashboard/
    ├── layout.tsx              # MODIFIED: wraps children in SidebarProvider + <AppSidebar /> +
    │                           #   SidebarInset, keeps the existing auth() redirect check unchanged
    ├── page.tsx                 # UNCHANGED — "Painel" destination
    ├── agenda/
    │   └── page.tsx              # NEW: minimal pt-BR placeholder Server Component
    ├── profissionais/
    │   └── page.tsx              # NEW: minimal pt-BR placeholder Server Component
    ├── servicos/
    │   └── page.tsx              # NEW: minimal pt-BR placeholder Server Component
    └── configuracoes/
        └── page.tsx              # NEW: minimal pt-BR placeholder Server Component
```

**Structure Decision**: Single Next.js App Router project (unchanged from
prior features). New dashboard sub-routes are plain nested folders under
`app/dashboard/` so they automatically inherit the existing `auth()` check in
`app/dashboard/layout.tsx` — no new protection logic needed. The sidebar
nav and logout button live under a new `components/dashboard/` directory
(parallel to the existing `components/auth/`) to keep feature-area components
grouped, one component per file per Principle VII. Nav-item data is isolated
in `lib/dashboard/nav-items.ts` rather than inlined in `app-sidebar.tsx`, so
the active-route matching logic and the data it matches against stay
separate from rendering.

## Complexity Tracking

*No entries — Constitution Check raised no unjustified violations.*
