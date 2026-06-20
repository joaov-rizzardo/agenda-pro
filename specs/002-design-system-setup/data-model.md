# Data Model: Design System Setup (Check-in Glass)

This feature has no database entities. "Data model" here means the design
token entities — the structured values every screen and component consumes
— per the Key Entities section of `spec.md`. All contrast figures and color
decisions are sourced from `research.md` (items 2–5).

## Entity: Color Token Set

CSS custom properties declared in `app/globals.css` `:root`, re-exposed to
Tailwind via `@theme inline` as `--color-*`. All values in `oklch()`.

| Token (CSS var) | Tailwind exposure | OKLCH value | Source hex | Role |
|---|---|---|---|---|
| `--background` | `bg-background` | `oklch(0.967 0.010 267.4)` | `#F1F4FB` (`base-50`) | App background |
| `--surface-alt` | `bg-surface-alt` | `oklch(0.941 0.017 271.2)` | `#E7EBF7` (`base-100`) | Alternating section background |
| `--card` | `bg-card` | `oklch(1 0 0)` | `#FFFFFF` (`white-0`) | Card/panel opaque surface |
| `--foreground` | `text-foreground` | `oklch(0.231 0.025 277.4)` | `#1A1C29` (`ink-900`) | Primary text |
| `--muted-foreground` | `text-muted-foreground` | `oklch(0.491 0.039 277.5)` | `#5B5F77` (`ink-600`) | Secondary text |
| `--primary` | `bg-primary` / `text-primary` | `oklch(0.701 0.211 286.9)`* | `#6A45F0` (`violet-600`) | Solid brand fallback (buttons w/o gradient, links, icons) |
| `--primary-foreground` | `text-primary-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Text/icon on `--primary` |
| `--gradient-primary` | `bg-[image:var(--gradient-primary)]` | n/a (gradient) | `#7C5CFF → #33D9C4` | Decorative gradient: avatars, card border accents, gradient text on light surfaces |
| `--gradient-primary-cta` | `bg-[image:var(--gradient-primary-cta)]` | n/a (gradient) | `#6A45F0 → #0B7A6B` | Text-safe gradient for CTA buttons/headers carrying white label text |
| `--border` | `border-border` | `oklch(0.911 0.021 274.0)` | `#DDE1F0` (`line-200`) | Dividers, card outlines (decorative, see research §5) |
| `--success` | `text-success` | `oklch(0.664 0.149 157.4)` | `#1FAE6E` | Status dot/icon only — never a fill behind white text |
| `--success-bg` | `bg-success-bg` | derived tint | `#E6F7EE` | Badge background |
| `--success-fg` | `text-success-fg` | derived shade | `#0F7A4D` | Badge text/icon (4.83:1 on `--success-bg`) |
| `--warn` | `text-warn` | `oklch(0.689 0.140 64.1)` | `#D6862B` | Status dot/icon only |
| `--warn-bg` | `bg-warn-bg` | derived tint | `#FBEFE1` | Badge background |
| `--warn-fg` | `text-warn-fg` | derived shade | `#9C5A14` | Badge text/icon (4.77:1 on `--warn-bg`) |
| `--danger` | `text-danger` | `oklch(0.627 0.182 24.0)` | `#E14F4F` | Status dot/icon only |
| `--danger-bg` | `bg-danger-bg` | derived tint | `#FCEAEA` | Badge background |
| `--danger-fg` | `text-danger-fg` | derived shade | `#B82F2F` | Badge text/icon (5.19:1 on `--danger-bg`) |

\* `violet-600` OKLCH computed the same way as the table in `research.md`
item 2 (same conversion method, darker lightness step).

**Validation rules** (from FR-001, FR-002, SC-002):

- No component may declare a literal hex/rgb color; every color usage
  resolves through one of the above CSS variables (or a Tailwind utility
  generated from them).
- Any token used as text color over a same-token-family background must
  have a documented contrast ratio ≥ 4.5:1 (normal text) or ≥ 3:1 (large
  text, ≥18.66px regular or ≥14px bold) — see `research.md` for the
  specific pairs verified.
- `--gradient-primary` (light pair) MUST NOT be used as a background behind
  overlaid label text; `--gradient-primary-cta` (dark pair) is the only
  gradient permitted under white text.

## Entity: Typography Scale

| Role | CSS var | Font | Weight range | Size/line-height (per research item 6 + proposal scale) |
|---|---|---|---|---|
| Display/heading (page titles) | `--font-display` (Sora) | Sora | 600–800 | 44px/1.1 (display), 22px/1.3 700 (heading) |
| Body/UI (paragraphs, forms, labels) | `--font-sans` (Plus Jakarta Sans) | Plus Jakarta Sans | 400–600 | 16px/1.5 400 |
| Data/mono (timestamps, IDs, codes) | `--font-mono` (Space Mono) | Space Mono | 400–500 | 13–14px/1.4 400–500 |

**Validation rules** (FR-003): every heading element uses `--font-display`;
every body/paragraph/form element uses `--font-sans` (the Tailwind default
`font-sans`); every timestamp/ID/code value uses `--font-mono`. No inline
`font-family` or arbitrary `text-[Npx]` size outside this scale.

## Entity: Shape Tokens

| Token | Value | Usage |
|---|---|---|
| `--radius` | `1.25rem` (20px, within proposal's 18–24px range) | Base radius; existing `@theme inline` derives `--radius-sm` through `--radius-4xl` from this |
| Pill shape | Tailwind `rounded-full` (no new token) | Buttons, nav bar, pill-shaped controls |

## Entity: Glass Surface Treatment

| Token | Value | Notes |
|---|---|---|
| `--glass-bg` | `oklch(1 0 0 / 0.6)` (white-0 at 60% alpha) | Matches proposal's `rgba(255,255,255,.6)` |
| `--glass-blur` | `18px` | `backdrop-filter: blur(var(--glass-blur))` |
| `--glass-border` | `oklch(1 0 0 / 0.4)` | Hairline edge so the panel reads as a distinct surface over blur |

**Validation rules** (FR-005, edge cases): only applied via the
`GlassPanel` component, never as a default card style; falls back to an
opaque `--card` background (no blur) under `prefers-reduced-transparency:
reduce` or when no controlled gradient backdrop is guaranteed behind it.

## Entity: Brand Override Token

Subset of Color Token Set flagged as the tenant-override surface (FR-009,
research item 9):

| Token | Overridable | Override mechanism (future feature) |
|---|---|---|
| `--primary` | Yes | CSS variable reassignment at a scoping wrapper element |
| `--gradient-primary` | Yes (derived from same brand hue if overridden) | Same |
| `--gradient-primary-cta` | Yes (must preserve the AA-safe darkening relationship from research item 3 if overridden) | Same |
| `--primary-foreground` | No (stays white; tenant override is bounded to hue, not to breaking text contrast — out of scope to design the bounding/validation logic in this feature, only to keep the token structurally override-ready) | n/a |

This feature does not implement override storage or UI — it only ensures
every consuming component reads `--primary`/`--gradient-primary*` rather
than a literal value, which is what makes a future override "just work"
(SC-005).
