# Phase 0 Research: Dashboard Sidebar Navigation Layout

## 1. Sidebar/drawer primitive

**Decision**: Use the shadcn/ui `Sidebar` registry component (`npx shadcn add
sidebar`) in its default `variant="sidebar"` / `collapsible="offcanvas"`
configuration: persistent on desktop (`md:` and up), rendered inside a
`Sheet` off-canvas drawer on mobile, toggled by `SidebarTrigger`.

**Rationale**: The component already implements exactly the split FR-007/
FR-008 require (persistent desktop sidebar vs. toggle-controlled mobile
drawer) without any custom media-query or drawer code. `app/globals.css`
already defines the full `--sidebar-*` token set the component consumes
(`--sidebar`, `--sidebar-foreground`, `--sidebar-accent`, etc. — see lines
24-31 and 137-186), confirming the design system already anticipated this
component. Building a bespoke drawer would duplicate an existing shadcn
equivalent, which Constitution Principle VIII explicitly forbids.

**Alternatives considered**:
- Custom CSS/JS drawer with manual `md:` breakpoints — rejected: duplicates
  the shadcn primitive (Principle VIII antipattern), more code to maintain.
- Radix `NavigationMenu` — rejected: designed for horizontal top-nav/mega-menu
  patterns, not a vertical app sidebar with built-in off-canvas mobile
  behavior; would still need a hand-built mobile drawer on top.

## 2. Active-item detection

**Decision**: A client component (`AppSidebar`) calls `usePathname()` from
`next/navigation` and compares it against each nav item's `href`: the
`Painel` item (`/dashboard`) uses an **exact** match; the other four
(`/dashboard/agenda`, `/dashboard/profissionais`, `/dashboard/servicos`,
`/dashboard/configuracoes`) use a **prefix** match (`pathname.startsWith`),
so any future sub-route under one of those sections still highlights the
correct top-level item.

**Rationale**: `Painel`'s route (`/dashboard`) is a literal prefix of every
other item's route, so it must be the only one using exact matching — using
prefix matching for it would make it stay highlighted on every other page.
`usePathname` in a client component is the standard, current App Router
pattern for this and is unaffected by the Next 16 breaking changes called out
in `AGENTS.md`.

**Alternatives considered**:
- Deriving active state server-side from the matched route segment and
  passing it down as a prop — rejected: adds layout/segment-config
  complexity for a purely presentational, leaf-level decision a small client
  component already handles cleanly.

## 3. Logout action

**Decision**: Add `logOut()` to `app/actions/auth.ts` — a Server Action with
no parameters that calls the already-exported `signOut` from `auth.ts` with
`redirectTo: "/login"`. The logout control in the sidebar is a `<form
action={logOut}>` wrapping a submit button (icon + "Sair" label), separate
from the five `<Link>`-based nav items per FR-005.

**Rationale**: `signOut` is already exported from `auth.ts` (unused until
now) as part of the `003-user-authentication` NextAuth setup — reusing it
keeps NextAuth as the single source of truth (Principle V) and needs no new
Route Handler or client-side NextAuth import.

**Alternatives considered**:
- `next-auth/react`'s client-side `signOut()` — rejected: pulls a
  client-side NextAuth API into an otherwise server-first feature; a plain
  Server Action form submission is simpler and consistent with how
  `signUp`/`logIn` are already implemented in the same file.

## 4. Placeholder pages

**Decision**: `Agenda`, `Profissionais`, `Serviços`, and `Configurações` each
get a minimal `app/dashboard/<slug>/page.tsx` Server Component rendering a
heading (the pt-BR section name) and a short "em breve" / "em construção"
style line — no client interactivity, no data fetching.

**Rationale**: FR-010 only requires the route to resolve to a valid page;
since there is no interactivity or data, a Server Component is the correct
default per Principle II, and avoids any unnecessary `"use client"` boundary.

**Route slugs** (pt-BR labels, ASCII-safe URL slugs): Agenda → `/dashboard/
agenda`; Profissionais → `/dashboard/profissionais`; Serviços →
`/dashboard/servicos`; Configurações → `/dashboard/configuracoes`.

## 5. Icons (lucide-react, already installed)

**Decision**: Painel → `LayoutDashboard`; Agenda → `CalendarDays`;
Profissionais → `Users`; Serviços → `Briefcase`; Configurações → `Settings`;
Sair (logout) → `LogOut`.

**Rationale**: Each maps unambiguously to its label's meaning per FR-002;
all are existing `lucide-react` icons (already a dependency), no new
package needed. Final visual selection is confirmed during the mandatory
`frontend-design` skill invocation (Principle IV), which may swap individual
icons for closer visual fits within the Check-in Glass system, but these are
the functional defaults.
