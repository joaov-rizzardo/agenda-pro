---

description: "Task list for Design System Setup (Check-in Glass)"
---

# Tasks: Design System Setup (Check-in Glass)

**Input**: Design documents from `/specs/002-design-system-setup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/design-tokens.md, quickstart.md (all present)

**Tests**: No automated test suite is requested by the spec or plan — validation is the manual procedure in `quickstart.md`. Tasks below include explicit "run quickstart checks" steps in place of automated tests.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story. There is no database/API layer in this feature — "implementation" means CSS custom properties in `app/globals.css`, font wiring in `app/layout.tsx`, and three new presentational components under `components/ui/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task description

## Path Conventions

Single Next.js App Router project at the repository root (see `plan.md` Project Structure): `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/ui/*.tsx`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring in the shadcn/ui primitives this feature must theme

- [X] T001 Install the shadcn/ui Button, Card, and Badge primitives via the shadcn CLI (`npx shadcn add button card badge`), generating `components/ui/button.tsx`, `components/ui/card.tsx`, and `components/ui/badge.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the token system itself — every user story consumes these tokens, so none can be tested until this phase is complete

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Replace the base/surface/card/foreground/muted-foreground/primary/primary-foreground tokens in `app/globals.css` `:root` with the Color Token Set oklch values from `data-model.md` (rows 1–7), using the hex→oklch conversions documented in `research.md` item 2
- [X] T003 Add the gradient tokens `--gradient-primary` and `--gradient-primary-cta` to `app/globals.css` `:root` per `data-model.md`, using the AA-safe darker CTA pair verified in `research.md` item 3
- [X] T004 Add the semantic state tokens `--success`/`--success-bg`/`--success-fg`, `--warn`/`--warn-bg`/`--warn-fg`, and `--danger`/`--danger-bg`/`--danger-fg` to `app/globals.css` `:root` per `data-model.md`, using the tint/shade fix documented in `research.md` item 4
- [X] T005 Add the glass surface tokens `--glass-bg`, `--glass-blur`, `--glass-border` to `app/globals.css` `:root`, plus a `prefers-reduced-transparency: reduce` media-query fallback that swaps to an opaque `--card` background with no `backdrop-filter`, per `data-model.md` Glass Surface Treatment and `research.md` item 7
- [X] T006 Update `--radius` in `app/globals.css` `:root` from `0.625rem` to `1.25rem` per `data-model.md` Shape Tokens and `research.md` item 10 (leave the existing `--radius-sm`…`--radius-4xl` derivation in `@theme inline` untouched)
- [X] T007 Update the `@theme inline` block in `app/globals.css` to expose `--color-surface-alt`, `--color-success`, `--color-success-bg`, `--color-success-fg`, `--color-warn`, `--color-warn-bg`, `--color-warn-fg`, `--color-danger`, `--color-danger-bg`, `--color-danger-fg` as Tailwind utilities, mapping to the tokens added in T002–T004 (depends on T002, T003, T004)
- [X] T008 [P] Replace `Geist`/`Geist_Mono` in `app/layout.tsx` with `Sora`, `Plus_Jakarta_Sans`, and `Space_Mono` loaded via `next/font/google`, each bound to its own CSS variable (e.g. `--font-sora`, `--font-plus-jakarta-sans`, `--font-space-mono`) applied as a `className` on `<html>`, per `research.md` item 6
- [X] T009 Update the `@theme inline` font mappings in `app/globals.css` (`--font-display`, `--font-sans`, `--font-mono`) to reference the font CSS variables introduced in T008 (depends on T008)

**Checkpoint**: Token system and font wiring are in place — user story implementation can now begin

---

## Phase 3: User Story 1 - Build any screen on a consistent visual language (Priority: P1) 🎯 MVP

**Goal**: A developer can build any screen (card, CTA, type roles) using only documented tokens and shadcn/ui components, with zero hardcoded values

**Independent Test**: `quickstart.md` checks 1–3 — build a screen with a card, a primary CTA, a title, a paragraph, and a timestamp, and confirm everything traces back to a token

### Implementation for User Story 1

- [X] T010 [P] [US1] Create `GradientText` component in `components/ui/gradient-text.tsx` implementing a `background-clip: text` treatment using `--gradient-primary`, with a solid `--primary`-colored text fallback for contexts where the gradient can't render, per `contracts/design-tokens.md`
- [X] T011 [US1] Update the primary variant of `components/ui/button.tsx` to render `--gradient-primary-cta` as its background with white label text in the default state, falling back to solid `--primary` in the `disabled` state, per `research.md` item 3 (depends on T001, T003)
- [X] T012 [US1] Verify and, if needed, adjust `components/ui/card.tsx` so its background, text, and border colors resolve only from the `--card`, `--foreground`, and `--border` tokens, per FR-007 (depends on T001, T002)
- [X] T013 [US1] Rebuild `app/page.tsx` as the token-validation demo screen: a `Card` panel, a primary `Button` CTA (default and disabled states), a page title in `font-display`, a body paragraph in `font-sans`, and a timestamp value in `font-mono` — zero hardcoded hex/px values, per `quickstart.md` checks 1–3 (depends on T010, T011, T012)
- [X] T014 [US1] Run `quickstart.md` checks 1–3 against the rebuilt `app/page.tsx` and confirm: no hardcoded values anywhere in the screen's source, correct type-role usage per element, and ≥4.5:1 contrast for the CTA label text at both gradient stops (depends on T013)

**Checkpoint**: User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Experience a cohesive, branded interface (Priority: P2)

**Goal**: The glass treatment is restricted to featured panels, ordinary surfaces stay opaque, and semantic states are distinguishable without relying on color alone

**Independent Test**: `quickstart.md` checks 4–6 — render semantic badges, a glass-treated featured panel next to an ordinary opaque card, and the scan-line element

### Implementation for User Story 2

- [X] T015 [P] [US2] Create `GlassPanel` component in `components/ui/glass-panel.tsx` implementing the translucent+blur surface from `--glass-bg`/`--glass-blur`/`--glass-border`, falling back to an opaque `--card` background with no blur, per `research.md` item 7 (depends on T005)
- [X] T016 [P] [US2] Create `ScanLine` component in `components/ui/scan-line.tsx` implementing the signature animated scan-line via CSS `@keyframes`, disabling the animation under `prefers-reduced-motion: reduce`, per `research.md` item 8
- [X] T017 [US2] Update the success/warning/danger variants of `components/ui/badge.tsx` to use the `*-bg`/`*-fg` tint pairs (e.g. `bg-success-bg text-success-fg`) instead of a saturated fill with white text, per `research.md` item 4 (depends on T001, T004, T007)
- [X] T018 [US2] Extend the `app/page.tsx` demo screen with a `GlassPanel`-wrapped featured strip containing a `ScanLine`, alongside the existing opaque `Card`, and one badge each for the success/warning/danger states, per FR-005 and FR-006 (depends on T013, T015, T016, T017)
- [X] T019 [US2] Run `quickstart.md` checks 4–6 against the extended demo screen and confirm: semantic badges are distinguishable without relying on color alone, the ordinary card stays opaque while the featured panel is translucent, and the panel/scan-line respect `prefers-reduced-transparency`/`prefers-reduced-motion` respectively (depends on T018)

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Prepare the system for future per-tenant branding (Priority: P3)

**Goal**: The primary brand tokens are structured so a future feature can override them without touching component code

**Independent Test**: `quickstart.md` check 8 — override `--primary`/`--gradient-primary`/`--gradient-primary-cta` and confirm every consumer re-themes with no other change

### Implementation for User Story 3

- [X] T020 [US3] Add a comment block directly above `--primary`/`--gradient-primary`/`--gradient-primary-cta` in `app/globals.css` documenting the future per-tenant override point and the AA-safe darkening relationship that must be preserved if these are overridden, per `data-model.md` Brand Override Token and `research.md` item 9 (depends on T002, T003)
- [X] T021 [US3] Run `quickstart.md` check 8: override `--primary`, `--gradient-primary`, and `--gradient-primary-cta` via devtools and confirm the `Button`, `GradientText`, and any links re-theme with no other manual change; revert afterward (depends on T010, T011, T020)

**Checkpoint**: All user stories are now independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all stories

- [X] T022 [P] Grep `app/` and `components/` for literal hex codes, `rgb(`, and arbitrary Tailwind values (`bg-[#`, `text-[`, `border-[`) to confirm zero hardcoded color/size values outside the token declarations themselves (SC-001)
- [X] T023 Run the full `quickstart.md` validation (all 8 checks) end-to-end as a final pass (depends on T014, T019, T021)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001, for the components T011/T012/T017 will theme) — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 can proceed alone once Foundational is done
  - US2 depends on US1's demo screen (T013) existing before T018 extends it — not on US1's components otherwise
  - US3 depends on US1's `Button`/`GradientText` (T010, T011) to verify override propagation
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational; its demo-screen task (T018) builds on US1's T013, but `GlassPanel`/`ScanLine`/`Badge` work (T015–T017) is independent of US1
- **User Story 3 (P3)**: Can start after Foundational; its validation (T021) exercises US1's `Button`/`GradientText`, but its own task (T020) is independent

### Within Each User Story

- Components before the demo-screen task that assembles them
- Demo-screen assembly before the quickstart validation task
- Story complete before its checkpoint

### Parallel Opportunities

- T008 (font wiring in `app/layout.tsx`) can run in parallel with T002–T007 (all in `app/globals.css`)
- T010 (`GradientText`) can run in parallel with T011/T012 (different files) within US1
- T015 (`GlassPanel`) and T016 (`ScanLine`) can run in parallel within US2
- T022 (grep audit) can run in parallel with the final quickstart pass setup, though T023 itself depends on all story validations being done

---

## Parallel Example: Foundational Phase

```bash
# T002-T007 all touch app/globals.css and must run sequentially.
# T008 touches app/layout.tsx and can run alongside them:
Task: "Replace Geist/Geist Mono with Sora, Plus Jakarta Sans, Space Mono in app/layout.tsx"
```

## Parallel Example: User Story 1

```bash
# Launch independent-file component tasks together:
Task: "Create GradientText component in components/ui/gradient-text.tsx"
Task: "Update primary Button variant in components/ui/button.tsx"
Task: "Verify/adjust Card token usage in components/ui/card.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T009) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T010–T014)
4. **STOP and VALIDATE**: run `quickstart.md` checks 1–3 independently
5. This alone delivers a themeable card + CTA + type-role screen — the foundation every later screen builds on

### Incremental Delivery

1. Setup + Foundational → token system and fonts ready
2. Add User Story 1 → validate (checks 1–3) → tokens proven usable for any screen
3. Add User Story 2 → validate (checks 4–6) → glass restriction and semantic states proven
4. Add User Story 3 → validate (check 8) → override-readiness proven
5. Polish → grep audit + full 8-check pass (T022–T023)

### Suggested MVP Scope

User Story 1 alone (T001–T014) is the MVP: it proves the token system is real and usable, which is the prerequisite for every future screen in the product.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No automated tests exist for this feature; quickstart-check tasks (T014, T019, T021, T023) stand in for them
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
