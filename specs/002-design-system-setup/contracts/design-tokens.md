# Contract: Design Tokens

This feature has no HTTP/API surface. Its "contract" is the set of CSS
custom properties and Tailwind utilities that every other screen/component
in the codebase is allowed to depend on. Anything not listed here is an
implementation detail of this feature and may change without notice;
anything listed here is the stable interface other code should consume
(per Principle IV / FR-007: every shadcn/ui component and every custom
component must theme through these, never bypass them).

## Consuming a token

- **Tailwind utility** (preferred): use the generated utility class, e.g.
  `bg-primary`, `text-success-fg`, `border-border`, `rounded-2xl`,
  `font-display`.
- **Raw CSS variable** (only when a Tailwind utility doesn't exist for the
  case, e.g. an inline gradient): `var(--gradient-primary-cta)`.
- Forbidden: literal hex/rgb values, arbitrary Tailwind values
  (`bg-[#7C5CFF]`, `text-[22px]`), or inline `style` color/font assignments
  outside the documented tenant-override mechanism (research.md item 9).

## Token surface (stable names — see `data-model.md` for values)

**Color**: `--background`, `--surface-alt`, `--card`, `--foreground`,
`--muted-foreground`, `--primary`, `--primary-foreground`,
`--gradient-primary`, `--gradient-primary-cta`, `--border`, `--success`,
`--success-bg`, `--success-fg`, `--warn`, `--warn-bg`, `--warn-fg`,
`--danger`, `--danger-bg`, `--danger-fg`.

**Typography**: `--font-display` (Sora), `--font-sans` (Plus Jakarta Sans),
`--font-mono` (Space Mono). Tailwind utilities: `font-display`,
`font-sans` (default), `font-mono`.

**Shape**: `--radius` and its derived scale `--radius-sm` … `--radius-4xl`
(unchanged derivation, new base value). Pill shape: Tailwind's built-in
`rounded-full` (not a custom token).

**Glass**: `--glass-bg`, `--glass-blur`, `--glass-border` — consumed only
through the `GlassPanel` component (`components/ui/glass-panel.tsx`), not
applied directly by feature code.

## Component-level contract

| Component | File | Exposes | Consumers must... |
|---|---|---|---|
| `GlassPanel` | `components/ui/glass-panel.tsx` | translucent+blur surface, with opaque fallback | use only for nav/featured/check-in panels, never as a default content card |
| `GradientText` (or equivalent CTA gradient utility) | `components/ui/gradient-text.tsx` | `background-clip: text` gradient treatment using `--gradient-primary` | not place this on top of another gradient/glass surface where contrast can't be guaranteed |
| `ScanLine` | `components/ui/scan-line.tsx` | the signature animated scan-line | respect built-in `prefers-reduced-motion` handling — no extra wrapper needed by callers |

## Breaking-change policy for this contract

Per FR-009/SC-005, `--primary`, `--gradient-primary`, and
`--gradient-primary-cta` are explicitly designed to be *value*-overridable
(future per-tenant feature) without being structurally changed. Renaming or
removing any token in this contract is a breaking change to every consumer
and must be reflected as a coordinated update across all components, not a
silent edit to `app/globals.css`.
