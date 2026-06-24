# Phase 1 Data Model: Dashboard Sidebar Navigation Layout

No Prisma models are added or changed by this feature. The only entity from
the spec ("Navigation Item") is a static, in-code configuration consumed by
the client — not persisted data.

## NavigationItem (static config, `lib/dashboard/nav-items.ts`)

| Field | Type | Notes |
|---|---|---|
| `label` | `string` | pt-BR display text (Painel, Agenda, Profissionais, Serviços, Configurações). |
| `href` | `string` | Destination route, e.g. `/dashboard`, `/dashboard/agenda`. |
| `icon` | `LucideIcon` (component reference) | One of `LayoutDashboard`, `CalendarDays`, `Users`, `Briefcase`, `Settings` (see `research.md` §5). |
| `matchExact` | `boolean` | `true` only for the `Painel` item (`/dashboard`), since its route is a prefix of every other item's route; `false`/omitted for the rest, which use prefix matching. |

This list is exported as a single ordered array (`NAV_ITEMS`), matching the
FR-001 order: Painel, Agenda, Profissionais, Serviços, Configurações. Active
state ("whether it is the currently active item" per the spec's Key Entities
section) is **derived at render time** in `AppSidebar` via `usePathname()`
compared against `href`/`matchExact` — it is not stored on the config object,
since it is a function of the current route, not static data.

The logout action is **not** a `NavigationItem` — per FR-005 it is rendered
as a separate control (a `<form>`-bound submit button) in the sidebar footer,
deliberately outside the `NAV_ITEMS` list.
