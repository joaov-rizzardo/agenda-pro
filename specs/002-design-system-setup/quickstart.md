# Quickstart: Validating the Design System Setup

Manual validation procedure — there is no automated test suite for this
feature (see `plan.md` Technical Context). Run these checks after the
tokens, fonts, and the three new components land.

## Prerequisites

```bash
npm run dev
```

Open the app at the dev server URL.

## 1. Token-only screen (User Story 1 / SC-001, SC-003)

Build (or reuse) one simple screen containing: a card panel, a primary CTA
button, a page title, a body paragraph, and a timestamp value — using only
shadcn/ui components and the tokens in `contracts/design-tokens.md`.

- **Expected**: zero hex codes, zero arbitrary `text-[Npx]`/`bg-[#...]`
  values anywhere in that screen's source. Background/border/text colors,
  font choices, and the card's corner radius all trace back to a token.

## 2. Type roles (FR-003)

On the same screen, inspect computed styles (devtools) for the title, the
paragraph, and the timestamp.

- **Expected**: title uses `--font-display` (Sora); paragraph uses
  `--font-sans` (Plus Jakarta Sans); timestamp uses `--font-mono` (Space
  Mono). No element falls back to the old Geist/Geist Mono fonts.

## 3. Primary CTA gradient + fallback (FR-002, research item 3)

- Render the primary button at default state: background should be the
  text-safe gradient (`--gradient-primary-cta`, `violet-600 → cyan-700`)
  with white label text.
- Render it `disabled`: should fall back to the solid `--primary`
  (`violet-600`), not the gradient.
- Use devtools' contrast checker (or browser accessibility inspector) on the
  button label text at both gradient ends. **Expected**: ≥ 4.5:1 at both
  ends (see `research.md` item 3 for the verified numbers: 5.64:1 and
  5.24:1).

## 4. Semantic states (FR-006, research item 4)

Render a success, a pending/warning, and an error badge/indicator.

- **Expected**: each uses the `*-bg`/`*-fg` tint pair (e.g.
  `bg-success-bg text-success-fg`), not a saturated fill with white text.
  Confirm visually they're distinguishable from each other without relying
  on color alone (e.g. accompanied by an icon or label, per the spec's
  edge case about color vision deficiency).

## 5. Glass treatment restriction (FR-005, User Story 2)

- Confirm the nav bar and/or the check-in/featured card use the
  `GlassPanel` component (translucent + blurred).
- Confirm an ordinary content card does **not** use `GlassPanel` — it should
  be fully opaque (`--card`).
- In devtools, toggle the "Emulate CSS media feature
  prefers-reduced-transparency: reduce" (or equivalent OS setting).
  **Expected**: the glass panel becomes opaque, no blur.

## 6. Reduced motion (Edge Cases)

- Locate the scan-line element (signature check-in element).
- In devtools, toggle "Emulate CSS media feature prefers-reduced-motion:
  reduce". **Expected**: the scan-line animation stops/is not rendered as
  moving.

## 7. Dashboard vs. public page consistency (User Story 2 / SC-004)

- Open the authenticated dashboard's main view and a public booking/check-in
  page side by side.
- **Expected**: same background/surface colors, same type roles, same
  corner-radius language, same glass treatment rules. No reviewer prompting
  should be needed to notice they belong to the same product.

## 8. Brand override readiness (User Story 3 / SC-005)

- Temporarily override `--primary`, `--gradient-primary`, and
  `--gradient-primary-cta` at the `:root` level (e.g. via devtools' "Styles"
  panel) to a different hue.
- **Expected**: the primary button, any text links, and any
  gradient-highlighted text update to the new color with no other manual
  change. Revert after checking.

## Done criteria

All eight checks pass with no hardcoded-value findings and no contrast
failures below the thresholds documented in `research.md`.
