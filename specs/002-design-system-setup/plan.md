# Implementation Plan: Design System Setup (Check-in Glass)

**Branch**: `002-design-system-setup` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-design-system-setup/spec.md`

## Summary

Establish the single source of visual truth for Agenda Pro — the "Check-in
Glass" design system from `design-proposals/proposta-5-checkin-glass.md` —
as Tailwind v4 CSS tokens layered on top of the existing shadcn/ui
(`radix-nova` preset) setup in `app/globals.css`. This covers color tokens
(base/surface/ink, primary gradient + solid fallback, semantic
success/warning/danger, borders), a three-role typography system (Sora /
Plus Jakarta Sans / Space Mono via `next/font/google`), a shared
corner-radius scale (panel radius + pill shape), a restricted "glass" surface
utility, and a documented override point for a future per-tenant primary
color. No new routes, API routes, or Prisma models are introduced — this is
purely the design-token and base-styling layer that every future screen
(dashboard and public booking pages) will consume.

Technical approach: extend `app/globals.css`'s existing `:root` / `@theme
inline` token blocks (the project's only theming surface under Tailwind v4 +
shadcn v4's CSS-variable convention) rather than introducing a
`tailwind.config.*` file or a second styling system. Two contrast-driven
deviations from the proposal's raw hex values are required to meet SC-002
(WCAG AA) and are captured in `research.md`: a darkened gradient pair for any
surface carrying white CTA text, and a tint/shade pair (`*-50`/`*-700`) for
semantic badges instead of white-on-saturated fills.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.9 (App Router), React 19.2.4

**Primary Dependencies**: Tailwind CSS v4 (CSS-first `@theme`, no
`tailwind.config.*`), shadcn/ui v4 CLI (`components.json` style
`radix-nova`, `cssVariables: true`), `next/font/google` (Sora, Plus Jakarta
Sans, Space Mono), `class-variance-authority`, `tailwind-merge`/`clsx`
(existing `lib/utils.ts`)

**Storage**: N/A — no schema, migration, or data-access changes

**Testing**: No automated test suite requested by the spec (per
constitution, tests are added only when the spec calls for them). Validation
is the manual/visual procedure in `quickstart.md`, driven by the contrast
numbers computed in `research.md` and the acceptance scenarios in
`spec.md`.

**Target Platform**: Web browser — both the authenticated dashboard and the
unauthenticated public booking/check-in pages, light theme only

**Project Type**: Single Next.js (App Router) web app — this feature is the
styling/token foundation layer, not a new module

**Performance Goals**: No regression to public-page first-load performance
(Constitution Principle II); the glass blur treatment must stay opt-in/scoped
so it never becomes a default-render cost across ordinary surfaces

**Constraints**: Light theme only; zero hardcoded hex/px values in
components (FR-001, FR-003, FR-004); WCAG AA text contrast (SC-002); glass
treatment restricted to featured panels only (FR-005); `prefers-reduced-motion`
and `prefers-reduced-transparency` must be respected for the scan-line
animation and blur; primary brand token must be overridable by a single CSS
variable (FR-009)

**Scale/Scope**: One global stylesheet (`app/globals.css`), font wiring in
`app/layout.tsx`, and a small set of new presentational components for the
non-shadcn signature elements (glass panel, gradient text/CTA, scan-line) —
no new pages or data flows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle IV (Design System & UI Consistency, NON-NEGOTIABLE)** — this
  feature *is* the direct implementation of this principle: it defines the
  token system that Principle IV requires going forward. PASS. The
  aesthetic direction itself was already decided in
  `design-proposals/proposta-5-checkin-glass.md` (the chosen proposal among
  alternatives); per Principle IV, any *new layout/screen* built on top of
  these tokens during `/speckit-implement` (e.g., a demo card, a check-in
  panel) must still separately invoke the `frontend-design` skill for its
  own layout decisions — token definition itself is a mechanical
  translation of an already-approved visual spec, not a new layout decision.
- **Principle I (Multi-Tenant Isolation)** — N/A, no data access introduced.
- **Principle II (Server-First Next.js)** — PASS. Fonts are loaded via
  `next/font/google` in the existing Server Component root layout; no new
  `"use client"` boundary is required for static tokens. If a
  `prefers-reduced-motion`/`prefers-reduced-transparency` toggle needs JS
  (it doesn't — both are handled via CSS media queries), that would need
  explicit justification, but the plan avoids it entirely.
- **Principle III (Validated API Routes)** — N/A, no API routes touched.
- **Principle V (Auth via NextAuth)** — N/A.
- **Principle VI (Prisma)** — N/A, no schema changes.
- **Principle VII (Component Architecture)** — applies to the new
  presentational components (glass panel, gradient CTA fallback, scan-line):
  each MUST be its own file, with any animation/contrast logic kept out of
  JSX (e.g., reduced-motion handling expressed as CSS, not component
  branching). PASS, to be enforced at task-generation/implementation time.
- **Principle VIII (Prohibited Antipatterns)** — the glass panel and
  scan-line are *not* shadcn equivalents (shadcn has no glassmorphism or
  scan-line primitive), so building them as custom components is
  permitted, not a violation of "don't duplicate shadcn primitives". No
  hardcoded hex/px values will ship outside the token definitions
  themselves.

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-design-system-setup/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── design-tokens.md # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── globals.css           # MODIFIED: color/typography/shape/glass tokens (Tailwind v4 @theme + :root)
├── layout.tsx             # MODIFIED: swap Geist/Geist Mono for Sora, Plus Jakarta Sans, Space Mono
└── page.tsx                # MODIFIED if needed: remove scaffold styles that hardcode values

components/
└── ui/
    ├── glass-panel.tsx     # NEW: restricted translucent+blur surface (one component per file)
    ├── gradient-text.tsx   # NEW: background-clip gradient text helper, solid fallback aware
    └── scan-line.tsx        # NEW: signature animated scan-line, respects prefers-reduced-motion

components.json            # UNCHANGED: cssVariables/css path already point at app/globals.css
```

**Structure Decision**: Single Next.js App Router project (existing
structure, see `specs/001-project-foundation-setup/plan.md`). No new
top-level directories. All token work lives in the existing Tailwind v4
CSS-first config inside `app/globals.css` (this project has no
`tailwind.config.*` — shadcn v4's `cssVariables: true` convention is the
only theming surface). New signature-element components go under
`components/ui/` alongside future shadcn-generated primitives, one component
per file per Principle VII.

## Complexity Tracking

*No entries — Constitution Check raised no unjustified violations.*
