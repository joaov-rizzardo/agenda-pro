# Research: Design System Setup (Check-in Glass)

## 1. Theming surface: where do tokens live?

**Decision**: Extend the existing `app/globals.css` `:root` block and
`@theme inline` block. Do not create a `tailwind.config.*` file.

**Rationale**: This project uses Tailwind CSS v4's CSS-first configuration
(`@import "tailwindcss"`, no JS/TS config) together with shadcn/ui v4
(`components.json` → `style: "radix-nova"`, `tailwind.cssVariables: true`,
`tailwind.css: "app/globals.css"`). All existing tokens (`--background`,
`--primary`, `--radius`, etc.) are CSS custom properties declared in
`:root`/`.dark` and re-exposed to Tailwind utilities via `@theme inline`.
Adding a parallel `tailwind.config.ts` would create two competing sources of
truth and contradicts how shadcn v4 already generates/consumes this file.

**Alternatives considered**: A `tailwind.config.ts` with a `theme.extend`
block (rejected — this Tailwind v4 setup has no JS config file at all, and
shadcn's CLI writes directly to `app/globals.css`); a separate
`design-tokens.css` imported into `globals.css` (rejected as unnecessary
indirection for a single-file, single-theme token set — revisit only if/when
multi-tenant override files are introduced).

## 2. Color value format: hex (proposal) vs oklch (existing tokens)

**Decision**: Convert every proposal hex value to `oklch()` and store *only*
the oklch value in `:root`, matching the existing token format
(`--primary: oklch(0.205 0 0)` etc.). Keep the proposal's hex value as a
source-of-truth comment/reference in `data-model.md`, not in the CSS itself.

**Rationale**: Mixed hex/oklch custom properties in the same token sheet is
inconsistent and oklch is what shadcn v4's generated tokens already use
project-wide; perceptual uniformity in oklch also makes it easier to derive
consistent tint/shade steps (needed for the badge fix in research item 4).

**Computed conversions** (sRGB hex → OKLCH, D65):

| Token | Hex | OKLCH |
|---|---|---|
| `base-50` | `#F1F4FB` | `oklch(0.967 0.010 267.4)` |
| `base-100` | `#E7EBF7` | `oklch(0.941 0.017 271.2)` |
| `white-0` | `#FFFFFF` | `oklch(1.000 0 0)` |
| `ink-900` | `#1A1C29` | `oklch(0.231 0.025 277.4)` |
| `ink-600` | `#5B5F77` | `oklch(0.491 0.039 277.5)` |
| `violet-500` | `#7C5CFF` | `oklch(0.599 0.230 286.2)` |
| `cyan-400` | `#33D9C4` | `oklch(0.799 0.133 182.1)` |
| `line-200` | `#DDE1F0` | `oklch(0.911 0.021 274.0)` |
| `success` | `#1FAE6E` | `oklch(0.664 0.149 157.4)` |
| `warn` | `#D6862B` | `oklch(0.689 0.140 64.1)` |
| `danger` | `#E14F4F` | `oklch(0.627 0.182 24.0)` |

**Alternatives considered**: Keeping hex (rejected — inconsistent with
existing tokens and with shadcn v4's oklch convention); HSL (rejected —
proposal already targets oklch-friendly perceptually-even adjustments, and
the project's pre-existing tokens are oklch, not HSL).

## 3. Gradient CTA text contrast (WCAG AA failure found)

**Problem found during research**: computing WCAG contrast for the
proposal's literal hex values shows the gradient, as specified, is not
AA-safe for white CTA-button text across its full span:

| Pair | Contrast | AA normal text (4.5:1) | AA large text (3:1) |
|---|---|---|---|
| white text on `violet-500` (`#7C5CFF`) | 4.35:1 | fail | pass |
| white text on `cyan-400` (`#33D9C4`) | 1.77:1 | fail | fail |

A button whose background sweeps from `violet-500` to `cyan-400` (135°,
per the proposal) will under no circumstance give white label text AA
contrast over the cyan end. This directly affects SC-002 ("All
text/background color combinations in the default theme meet at least WCAG
AA").

**Decision**: Define **two** gradient pairs sharing the same hue/angle:

- `--gradient-primary` (decorative): `violet-500 → cyan-400` — used only
  where no text is overlaid directly on the gradient fill (avatar rings,
  card border accents, and gradient *text* via `background-clip: text` sitting on a
  light/opaque surface, where contrast is evaluated between the text's
  darkest gradient stop and the page background, not within the gradient).
- `--gradient-primary-cta` (text-safe, darker): `violet-600 (#6A45F0) →
  cyan-700 (#0B7A6B)` — used for any surface that carries white label text
  (primary buttons, the check-in "scan" card header). Verified:

| Pair | Contrast |
|---|---|
| white text on `violet-600` (`#6A45F0`) | 5.64:1 — pass |
| white text on `cyan-700` (`#0B7A6B`) | 5.24:1 — pass |

Both darker stops preserve the same hue family (violet/cyan) so the CTA
still reads as the brand gradient; it is simply deepened enough to stay
legible. The solid primary fallback (FR-002, for outlines/disabled/plain
text) uses `violet-600` rather than the lighter `violet-500`, since
`violet-600` is also AA-safe as link/text color on white (5.64:1) and on
`base-50` (5.12:1), giving one consistent solid value for both "fallback
surface" and "fallback text/link" roles.

**Alternatives considered**: Adding a dark scrim/overlay behind CTA text
(rejected — extra layer/complexity for a problem solvable by picking
AA-safe stops); using dark (`ink-900`) text on the original lighter gradient
(rejected — `ink-900` on `violet-500` is only 3.89:1, still fails normal-text
AA, and dark-on-gradient reads inconsistently against light-on-gradient
expectations elsewhere in the system).

## 4. Semantic colors as solid badge fills (WCAG AA failure found)

**Problem found during research**: white text on the proposal's saturated
semantic fills also fails AA for normal-size text:

| Pair | Contrast |
|---|---|
| white text on `success` (`#1FAE6E`) | 2.86:1 — fail |
| white text on `warn` (`#D6862B`) | 2.88:1 — fail |
| white text on `danger` (`#E14F4F`) | 3.87:1 — fail (passes large-text only) |

**Decision**: Semantic colors get two roles per state, following the common
accessible-badge pattern (soft tint background + saturated text/icon,
instead of saturated fill + white text):

| State | `*-50` tint bg | `*-700` text/icon | Contrast |
|---|---|---|---|
| success | `#E6F7EE` | `#0F7A4D` | 4.83:1 — pass |
| warn | `#FBEFE1` | `#9C5A14` | 4.77:1 — pass |
| danger | `#FCEAEA` | `#B82F2F` | 5.19:1 — pass |

The original saturated values (`success`/`warn`/`danger` from the proposal)
remain defined and are used for small non-text indicators where the 3:1
non-text contrast threshold (not 4.5:1) applies — status dots, icon-only
badges, focus rings — never as a fill behind white label text.

**Alternatives considered**: Darkening the saturated colors themselves
until white text passes (rejected — would shift the proposal's specified
success/warn/danger hues further than necessary and lose the bright
"signal" dot/icon use case); using `ink-900` text on the saturated fills
(rejected — inconsistent badge style vs. the tint/shade pattern that shadcn
`Badge` variants and most design systems already use, and still requires a
second contrast check per state).

## 5. Border/divider contrast (informational, not a violation)

`line-200` (`#DDE1F0`) against `white-0` is 1.30:1, far under the 3:1
non-text-element threshold (WCAG 1.4.11). **Decision**: accepted as-is —
SC-002 scopes AA only to *text*/background combinations, and `line-200` is
used exclusively for decorative dividers/card outlines, not as a
load-bearing boundary that conveys information on its own (those cases use
borders *plus* spacing/shadow). No token change; documented here so it is
not mistaken for an oversight later.

## 6. Typography: font loading mechanism

**Decision**: Load all three fonts via `next/font/google` in
`app/layout.tsx`, replacing the scaffolded Geist/Geist Mono, each bound to a
CSS variable consumed by `@theme inline`:

- `Sora` → `--font-display` (weights 600–800)
- `Plus_Jakarta_Sans` → `--font-sans` (weights 400–600)
- `Space_Mono` → `--font-mono` (weights 400–500)

**Rationale**: `next/font/google` self-hosts the font files at build time
(no runtime request to Google Fonts, no layout shift) and is the documented
App Router pattern in this Next.js version
(`node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`). All
three requested families are available through `next/font/google`. This
keeps font loading server-side and zero-JS, consistent with Principle II.

**Alternatives considered**: Self-hosted local font files via
`next/font/local` (rejected — adds binary assets and licensing/version
upkeep with no benefit over Google's hosted-and-optimized files for this
stack); a `<link>` to Google Fonts CDN (rejected — reintroduces the
render-blocking external request `next/font` exists to eliminate).

## 7. Glass surface treatment: implementation approach

**Decision**: Define glass as a small set of CSS custom properties
(`--glass-bg`, `--glass-blur`, `--glass-border`) plus a single reusable
`.glass-panel` utility class declared in `app/globals.css` via Tailwind v4's
`@utility` directive, and consumed by a dedicated `GlassPanel` component
(`components/ui/glass-panel.tsx`) rather than applied ad hoc per screen.
Component usage (nav, check-in/featured card) is what enforces FR-005's
"restricted to featured panels" rule — there is no global default that
makes every card translucent.

Two fallbacks are required and both are CSS-only (no JS/`"use client"`
needed):

- `@media (prefers-reduced-transparency: reduce)` → swap `--glass-bg` to a
  fully opaque surface color (`white-0`) and drop the `backdrop-filter`.
- A low-contrast-background fallback per the spec's Edge Cases: if a glass
  panel is needed over a background that isn't the system's controlled
  radial-gradient backdrop, the component falls back to the same opaque
  surface rather than rendering translucent over unknown/low-contrast
  content.

**Alternatives considered**: A Tailwind arbitrary-value utility
(`backdrop-blur-[18px] bg-white/60`) repeated per usage site (rejected —
violates FR-001/FR-007's "no one-off values" requirement and Principle
VIII's prohibition on bypassing the token system); a CSS-in-JS/client
component that detects `prefers-reduced-transparency` via
`window.matchMedia` (rejected — unnecessary client JS for something a media
query handles natively, violates Principle II's "don't add `"use client"`
without a real interactivity need").

## 8. Scan-line animation and `prefers-reduced-motion`

**Decision**: The scan-line is a CSS `@keyframes` animation applied in the
`ScanLine` component, wrapped so the animation is disabled (replaced with a
static line or no animation at all) inside `@media
(prefers-reduced-motion: reduce)`. Pure CSS, no JS.

**Rationale**: Matches the spec's edge case requirement directly and avoids
introducing a client component purely to read a media query that CSS itself
can branch on.

**Alternatives considered**: A `useMediaQuery` hook toggling a class
client-side (rejected — adds a `"use client"` boundary and a hydration
mismatch risk for something achievable in pure CSS).

## 9. Future per-tenant brand override mechanism (FR-009)

**Decision**: The only token that must be safely overridable later is the
primary brand pair: `--color-primary` (solid, `violet-600`),
`--gradient-primary`, and `--gradient-primary-cta`. Document (in
`data-model.md`) that a future per-tenant feature overrides these three CSS
custom properties at a scoping element (e.g., an inline `style` attribute on
the public booking page's root wrapper, set server-side from the tenant's
stored brand color) — no component code changes, since every consuming
component already reads the CSS variable rather than a hardcoded value.
This feature does **not** build the override UI or storage; it only ensures
the token structure makes the override mechanically trivial (SC-005's test
is exactly this: changing one token value re-themes button/link/highlight
everywhere).

**Alternatives considered**: A JS theme-object passed via React context
(rejected — heavier than necessary, and the public booking page must stay a
fast Server Component per Principle II; CSS variables achieve the same
override with zero client JS).

## 10. Shape tokens: radius scale

**Decision**: Set `--radius: 1.25rem` (within the proposal's 18–24px /
1.125–1.5rem range, existing `@theme inline` already derives
`--radius-sm/md/lg/xl/2xl/3xl/4xl` from this single value — no change to
that derivation chain). Buttons, nav, and pill-shaped controls use
`rounded-full` (Tailwind's built-in 9999px utility), not a new token, since
"pill" is already a solved case in Tailwind core.

**Rationale**: Reuses the existing `@theme inline` radius-scale formula
(`calc(var(--radius) * N)`) already wired into `app/globals.css` — only the
base `--radius` value needs to move from the scaffold default (`0.625rem`)
into the proposal's larger range.

**Alternatives considered**: A separate `--radius-pill` token (rejected —
redundant with Tailwind's existing `rounded-full`).
