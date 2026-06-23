<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0
- Modified principles:
  - VIII. Strictly Prohibited Antipatterns — list expanded with a pt-BR copy antipattern entry
- Added sections:
  - X. User-Facing Language (pt-BR) (new principle)
- Removed sections: none
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check gate is generic/dynamic, no edit required
  - ✅ .specify/templates/spec-template.md — no constitution-specific references, no edit required
  - ✅ .specify/templates/tasks-template.md — no constitution-specific references, no edit required
  - ⚠ .specify/templates/commands/*.md — directory does not exist in this project, nothing to sync
  - ✅ AGENTS.md / CLAUDE.md — no language-specific guidance present to reconcile, no edit required
- Follow-up TODOs: none
-->

# Agenda Pro Constitution

## Core Principles

### I. Multi-Tenant Isolation by Default (NON-NEGOTIABLE)

Agenda Pro is a multi-tenant SaaS: every business (tenant) and every public
booking page MUST be fully isolated from every other tenant's data. Concretely:

- Every database query touching tenant-scoped tables MUST filter by the
  tenant/business identifier resolved from the authenticated session or from
  a validated public booking-page slug — never from an unchecked client-supplied
  field.
- Route Handlers MUST re-derive the tenant context server-side (session,
  signed token, or validated slug lookup) before reading or writing data.
  A `tenantId`/`organizationId` arriving in a request body or query string
  MUST be treated as untrusted input and verified, never used directly.
- Prisma models that belong to a tenant MUST include the tenant foreign key
  and an index on it; new tables MUST NOT be added without one unless they
  are explicitly global (e.g., plan definitions).
- Any cross-tenant data exposure is treated as a security incident, not a bug,
  and blocks release.

**Rationale**: A single missed tenant filter leaks one business's customers,
appointments, or revenue data to another. This is the single highest-impact
failure mode for the product and must be structurally prevented, not just
tested for.

### II. Server-First Next.js Architecture & Up-to-Date API Usage

This project pins `next@16` and `react@19`. Their APIs and conventions MAY
differ from training knowledge — per `AGENTS.md`, the docs under
`node_modules/next/dist/docs/` are the source of truth and MUST be consulted
before using an unfamiliar API or pattern.

- Server Components are the default. A component MUST only be marked
  `"use client"` when it genuinely needs browser APIs, interactivity, or
  React state/effects — and that boundary MUST be pushed as low (leaf-level)
  in the tree as possible.
- Data reads happen in Server Components or Route Handlers at request time;
  client components receive data as props or via explicit, justified
  client-side fetches (e.g., live polling), never as the default pattern for
  initial page data.
- Routing, layouts, metadata, and caching/revalidation MUST use the current
  App Router primitives documented for this Next version — not patterns
  carried over from the Pages Router or from older Next major versions.
- Public booking pages (the core acquisition surface) MUST be optimized for
  fast first load (server-rendered, minimal client JS) since end customers
  arrive with no account and no warm cache.

**Rationale**: Next 16/React 19 introduce breaking changes versus older
training data; defaulting to outdated patterns produces code that looks
plausible but is wrong or deprecated. Server-first rendering also keeps the
unauthenticated public booking flow fast, which directly affects conversion.

### III. Type-Safe, Validated API Routes

Every Next.js Route Handler (`app/api/**/route.ts` or equivalent) MUST:

- Validate all input (body, query params, route params) against an explicit
  schema (e.g., Zod) before any business logic executes; reject invalid input
  with a typed `4xx` JSON error, never trust shape or types implicitly.
- Perform authentication/session resolution and tenant-context checks (see
  Principle I) at the top of the handler, before any data access.
- Return a consistent, typed JSON response shape for both success and error
  cases across the API surface.
- Delegate business logic to plain service/helper functions rather than
  inlining complex logic in the handler body, so the logic is testable
  independent of the HTTP layer — without introducing speculative
  abstractions for routes that are genuinely simple.
- Never use `any` (or untyped `unknown` left unnarrowed) to bypass
  TypeScript on request/response contracts.

**Rationale**: API routes are the trust boundary between untrusted clients
(including the public, account-less booking flow) and the database. Loose
typing or skipped validation at this boundary is the most common source of
both bugs and security issues in this stack.

### IV. Design System & UI Consistency (NON-NEGOTIABLE)

Agenda Pro MUST present a single, coherent design system across the tenant
dashboard and every public booking page it renders.

- Any new layout, screen, or significant visual change MUST go through the
  `frontend-design` skill for aesthetic/layout decisions before
  implementation. This is mandatory for layout work, not optional guidance.
- Colors and typography MUST be expressed as design tokens (Tailwind theme
  values / CSS variables), never as hardcoded hex codes, raw pixel font
  sizes, or one-off Tailwind arbitrary values scattered across components.
- shadcn/ui components MUST be used whenever an equivalent exists (buttons,
  inputs, dialogs, forms, tables, etc.). Custom components are only built
  when shadcn/ui has no equivalent, and MUST consume the same token system
  so they remain visually consistent.
- Tenant-facing customization (e.g., a business's public booking page theme)
  MUST be implemented as a constrained set of token overrides (brand color,
  logo, etc.), not as free-form per-tenant CSS/markup that can drift from the
  design system.

**Rationale**: With many tenants and a public-facing booking surface, visual
inconsistency or ad-hoc styling compounds quickly and erodes trust in the
product. Tokens plus shadcn/ui give consistency and speed simultaneously.

### V. Authentication & Authorization via NextAuth

- NextAuth is the single source of truth for session state. Server-side
  protection of data and pages MUST use NextAuth's server-side session
  helpers inside Server Components and Route Handlers — client-side checks
  (e.g., hiding a button) are a UX nicety, never the actual access control.
- The tenant/business owner area (authenticated) and the public booking
  pages (intentionally account-less for the end customer) MUST be clearly
  separated in routing and middleware; public booking routes MUST NOT
  accidentally inherit authenticated-only data fetching or assumptions.
- Authorization (e.g., role within a business, ownership of a resource) MUST
  be checked server-side per request; it MUST NOT be inferred solely from
  client-provided state.
- Secrets (NextAuth secret, database URLs, provider credentials) MUST live in
  server-only environment variables; `NEXT_PUBLIC_*` MUST NOT be used for
  anything secret.

**Rationale**: The product's core promise is that end customers never need
an account, while business owners need properly scoped access to their own
tenant's data only. Both guarantees depend entirely on correct, server-side
enforcement.

### VI. Prisma-Mediated Database Access & Migrations

- All schema changes go through Prisma migrations checked into the repo;
  ad-hoc schema edits via the Supabase dashboard are not permitted as the
  system of record — if used for a quick exploration, they MUST be reflected
  back into a Prisma migration before being considered complete.
- The Prisma client is only ever called from server-side code (Route
  Handlers, Server Components, server actions, services) — never imported
  into a `"use client"` component or shipped to the browser.
- New or changed tenant-scoped tables MUST include the tenant foreign key and
  an index on it (see Principle I); migrations affecting tenant isolation or
  involving destructive operations (drops, irreversible data transforms)
  MUST be called out explicitly and confirmed before applying.

**Rationale**: Prisma migrations are the only way schema state stays
reproducible across environments (local, staging, Supabase production);
bypassing them via dashboard edits causes drift that silently breaks tenant
isolation guarantees and future migrations.

### VII. Component Architecture, Separation of Concerns & Client State

- **One component per file, always.** A file MUST export exactly one
  component as its primary export. Splitting a file into multiple components
  "for convenience" is not permitted — each component gets its own file,
  named after the component.
- **Business logic lives outside presentational components.** Calculations,
  validation, data shaping/transformation, and orchestration MUST be
  extracted into hooks (`use*`), service/helper modules, or utility
  functions — never written inline inside JSX or mixed into a component whose
  job is rendering. A component MUST be reducible to "receive data/state, call
  the logic, render the result."
- **Break components down as they grow.** When a component accumulates
  multiple responsibilities (e.g., a form section, a list item, a modal body)
  it MUST be decomposed into smaller, focused child components rather than
  growing as one large file with nested JSX and branching.
- **Client-side data fetching and mutations MUST use React Query
  (`@tanstack/react-query`).** Raw `useEffect` + `fetch`/`axios` for reading
  or mutating server data is not permitted — React Query owns loading, error,
  caching, and revalidation state for anything that comes from an API route.
- **Client-side shared/global state MUST use Zustand.** Zustand stores are
  for UI/client state that needs to be shared across components (e.g.
  multi-step booking wizard progress, open/closed UI state, client-only
  preferences) — not as a cache or duplicate of server data, which belongs to
  React Query. Component-local state that no sibling needs stays in
  `useState`/`useReducer`.

**Rationale**: One component per file keeps files easy to locate, review, and
test. Separating business logic from rendering makes both independently
testable and lets the same logic be reused (e.g., a price calculation used in
the dashboard and the public booking page) without copy-pasting JSX. Standardizing
on React Query and Zustand removes the inconsistent, ad-hoc data-fetching and
state patterns that otherwise accumulate per-developer in a Next.js codebase.

### VIII. Strictly Prohibited Antipatterns (NON-NEGOTIABLE)

The following are explicitly forbidden in this codebase. Code review and
agent-driven changes MUST reject these on sight:

- Trusting a client-supplied `tenantId`/`organizationId` (body, query, or
  header) without re-validating it against the authenticated session or a
  validated public slug.
- Fetching initial page data via client-side `useEffect` + `fetch` when a
  Server Component or Route Handler could supply it at request time.
- Mixing Pages Router patterns (`getServerSideProps`, `getStaticProps`,
  `pages/`-based API routes) into this App Router project.
- Calling the Prisma client from a `"use client"` component, or from any code
  path that ships to the browser.
- Marking a component `"use client"` "just in case" rather than because it
  needs interactivity, state, or browser APIs.
- Building a custom UI primitive (button, input, modal, dropdown, etc.) that
  duplicates an existing shadcn/ui component.
- Hardcoding colors, font sizes, or spacing values that bypass the design
  token system.
- Skipping the `frontend-design` skill for new layout/screen design work.
- Catching errors in an API Route and returning a generic `200` or silently
  swallowing them instead of a typed error response with appropriate status
  and logging.
- Using `any`, or leaving `unknown` unnarrowed, to bypass type-checking on
  request/response contracts or Prisma query results.
- Storing secrets, API keys, or database credentials in `NEXT_PUBLIC_*`
  environment variables.
- Writing code against remembered/training-data Next.js or React APIs for
  this project without checking `node_modules/next/dist/docs/` when the
  pattern is unfamiliar or has known breaking-change history.
- Defining more than one component in a single file.
- Embedding business logic (validation, calculations, data shaping) directly
  inside a component's JSX/render body instead of a hook, service, or
  utility function.
- Using `useEffect` + `fetch`/`axios` to read or mutate server data instead
  of React Query.
- Storing server data (anything fetched from an API route) inside a Zustand
  store instead of letting React Query own it as cache.
- Designing or implementing a new layout desktop-first and treating the
  mobile viewport as an afterthought or retrofit (Principle IX).
- Shipping new user-facing screen copy or transactional email content in
  English (or any language other than pt-BR), or leaving translation to a
  follow-up pass instead of writing it in pt-BR from the start (Principle X).

**Rationale**: These are not style preferences — each one maps to a concrete
failure already known to be costly in this stack (tenant data leaks, security
boundary bypasses, visual inconsistency, or silently broken behavior from
outdated API assumptions). Naming them explicitly removes ambiguity.

### IX. Mobile-First Development (NON-NEGOTIABLE)

- All new layouts, screens, and components MUST be designed and implemented
  mobile-first: build and verify the smallest-breakpoint layout first, then
  progressively enhance upward with Tailwind's `sm:`/`md:`/`lg:`/`xl:`
  variants — never the inverse of designing for desktop and retrofitting a
  mobile fallback.
- The public booking/check-in pages — the primary unauthenticated,
  account-less entry point — MUST be treated as mobile-first by default,
  since end customers overwhelmingly arrive on a phone; the desktop layout is
  the enhancement, not the baseline.
- Every `frontend-design` skill invocation (Principle IV) MUST produce and
  validate the mobile viewport composition before any wider-breakpoint
  variant is designed or implemented.
- Touch targets, spacing, and the type scale MUST remain usable at the
  smallest supported viewport: no fixed-width layouts, and no horizontal
  scroll required to reach primary actions or content.
- Manual or visual verification of a new or changed screen MUST check the
  mobile viewport, not desktop only, before the work is considered complete.

**Rationale**: Agenda Pro's highest-stakes surface — the public booking/
check-in flow — is overwhelmingly used on mobile devices by end customers
with no account and no patience for a desktop layout shrunk to fit a phone.
Designing desktop-first and retrofitting mobile reliably produces cramped,
broken, or slow mobile experiences exactly where conversion matters most.

### X. User-Facing Language (pt-BR) (NON-NEGOTIABLE)

- Every piece of text a real end user (business owner or public booking
  customer) sees MUST be written in Brazilian Portuguese (pt-BR): screen
  copy, headings, form labels and placeholders, buttons, validation/error
  messages, success/confirmation states, and transactional emails (subject
  line and body).
- This principle governs user-facing text only. Code identifiers, comments,
  commit messages, internal documentation, and developer-facing output
  (console/server logs, stack traces, error codes surfaced only in logs)
  remain in English.
- The HTML `lang` attribute on any document a user-facing page or email
  renders (`app/layout.tsx`, standalone email templates) MUST be set to
  `pt-BR` wherever pt-BR content is rendered.
- New screens, components, or emails MUST ship with pt-BR copy from the
  start — translation is not a follow-up pass done after merge.

**Rationale**: Agenda Pro's business owners and their end customers are a
Brazilian Portuguese–speaking audience. English (or mixed-language) copy
anywhere in the user-facing surface — a screen, a button, or a transactional
email — breaks the product experience and reads as unfinished, regardless of
how correct the underlying logic is.

## Technology Stack & Constraints

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS + shadcn/ui.
- **Client-side data**: React Query (`@tanstack/react-query`) for all
  client-side server-data fetching/mutations; Zustand for client-only shared
  state. No other client data-fetching or global-state library is used.
- **Backend**: Next.js API Routes (Route Handlers) — no separate backend
  service for v1.
- **Authentication**: NextAuth, server-side session enforcement.
- **Database**: PostgreSQL hosted on Supabase, accessed exclusively through
  Prisma ORM and Prisma Migrate.
- **Multi-tenancy model**: shared database, shared schema, tenant-scoped rows
  (tenant foreign key + index) unless/until a documented decision changes
  this for scale or compliance reasons.
- **Public surface**: booking pages MUST be usable by end customers without
  creating an account; any feature requiring an end-customer account is out
  of scope unless explicitly redefined.
- Library/framework versions in `package.json` are authoritative over any
  assumed defaults; when in doubt about an API, check installed version docs
  before writing code (see Principle II).

## Development Workflow & Quality Gates

- Any task that creates or changes layout/UI MUST invoke the `frontend-design`
  skill before implementation, per Principle IV, and that invocation MUST
  cover the mobile viewport first, per Principle IX.
- New or changed screens MUST be verified at a mobile viewport width before
  being considered complete, in addition to any wider breakpoint (Principle
  IX).
- New or changed user-facing copy (screens, emails) MUST be written in pt-BR
  before being considered complete; English placeholder copy left in a
  user-facing surface is a blocking issue, not a follow-up (Principle X).
- TypeScript type-checking and lint MUST pass before a change is considered
  complete; `any`/unchecked `unknown` on API or Prisma boundaries is a
  blocking issue, not a warning (Principles III, VII).
- New or changed Prisma schema MUST ship with a corresponding migration in
  the same change; schema and migration MUST NOT drift (Principle VI).
- Code review (human or agent-assisted) MUST explicitly check new/changed API
  routes and data-access code against Principle I (tenant isolation),
  Principle VII (component architecture, one-per-file, logic separation,
  React Query/Zustand usage), and Principle VIII (prohibited antipatterns)
  before merge.
- Tests are written when explicitly requested by the feature spec (per
  `spec-template.md`); when present, they MUST cover tenant-isolation
  boundaries for any new data-access code as a priority over incidental
  coverage.

## Governance

This constitution supersedes ad-hoc conventions, prior habits, or
training-data defaults for Next.js/React when they conflict with it. All
plans, specs, and implementation tasks produced by the Spec Kit workflow
(`/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, etc.) MUST be
checked against these principles; a violation MUST either be resolved or
explicitly justified in the plan's Complexity Tracking section.

**Amendment procedure**: Amendments are made by editing this file directly,
updating the Sync Impact Report at the top, and propagating any required
changes to `.specify/templates/*.md` and agent guidance files
(`AGENTS.md`/`CLAUDE.md`) in the same change.

**Versioning policy**: Semantic versioning applies to this document.
- MAJOR: backward-incompatible removal or redefinition of a principle
  (e.g., dropping the multi-tenant isolation requirement).
- MINOR: a new principle or materially expanded section is added.
- PATCH: wording clarifications, typo fixes, non-semantic edits.

**Compliance review**: Every feature plan's Constitution Check gate MUST
reference the principles above by name when justifying or flagging
deviations. Repeated or unjustified violations of a NON-NEGOTIABLE principle
block merge regardless of feature priority.

**Version**: 1.3.0 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-23
