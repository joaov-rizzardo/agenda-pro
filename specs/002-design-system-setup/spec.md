# Feature Specification: Design System Setup (Check-in Glass)

**Feature Branch**: `[002-design-system-setup]`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Quero configurar o design system do meu projeto, utilizando padrão de cores, tipografia, bordas e etc. Esse design system deve seguir as melhores práticas quando trabalhando em conjunto com tailwind + shadcnui. A definição do design system podem ser encontrado em proposta-5-checkin-glass.md."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build any screen on a consistent visual language (Priority: P1)

A developer building a new screen (dashboard or public booking page) needs
colors, typography, spacing, and border treatments to come from a single,
documented source so the screen automatically looks and feels like the rest
of the product, without inventing one-off styles.

**Why this priority**: Without a usable token system, every subsequent
screen and feature risks visual drift, hardcoded values, and rework. This is
the foundation every other UI feature in the product depends on.

**Independent Test**: Can be fully tested by building one representative
screen (e.g., a simple form with a primary action) using only the documented
tokens and shadcn/ui components, and confirming it matches the intended
visual identity (colors, type, radius) with zero hardcoded hex codes or
arbitrary pixel values.

**Acceptance Scenarios**:

1. **Given** the design system tokens are in place, **When** a developer
   creates a new card-based panel, **Then** the panel's background, text
   color, border, and corner radius all resolve from existing tokens rather
   than hardcoded values.
2. **Given** the design system tokens are in place, **When** a developer adds
   a primary call-to-action button, **Then** the button automatically
   receives the brand's primary visual treatment (including a usable fallback
   where the signature gradient cannot be rendered, e.g., disabled state)
   without custom per-button styling.
3. **Given** the typography tokens are in place, **When** a developer adds a
   page title, a body paragraph, and a timestamp/code-like value, **Then**
   each uses the correct type role (display, body, data/mono) with consistent
   size and weight across the app.

---

### User Story 2 - Experience a cohesive, branded interface (Priority: P2)

A business owner (in the authenticated dashboard) and their end customer (on
an account-less public booking page) both perceive a single, polished,
trustworthy visual identity — light, translucent, and modern — rather than a
patchwork of mismatched screens.

**Why this priority**: Visual inconsistency between the dashboard and the
public booking surface undermines trust at exactly the point (booking,
check-in) where conversion matters most. This depends on Story 1's tokens
existing, but is the user-facing payoff.

**Independent Test**: Can be tested by reviewing the dashboard's main view and
a public booking/check-in view side by side and confirming they share the
same color palette, type system, corner-radius language, and signature
gradient/glass treatment, with no jarring visual mismatch between them.

**Acceptance Scenarios**:

1. **Given** a tenant's public booking/check-in page and their dashboard,
   **When** a user navigates between the two, **Then** both surfaces use the
   same base colors, typography, and rounded/pill shape language.
2. **Given** a "check-in" style highlighted panel (e.g., nav bar or featured
   card), **When** it is rendered, **Then** it uses the translucent
   "glass" treatment, while ordinary content surfaces remain fully opaque and
   legible.
3. **Given** a confirmation, a pending, and an error state are shown to the
   user, **Then** each is visually distinguishable using the system's
   semantic success/warning/danger colors consistently.

---

### User Story 3 - Prepare the system for future per-tenant branding (Priority: P3)

A future feature will let a business customize a constrained set of brand
elements (e.g., their primary color) on their public booking page. The design
system needs to be structured so that this can happen later through token
overrides, without redesigning components.

**Why this priority**: This is not required for the initial rollout to look
correct, but its absence would force a costly rework later. It is lower
priority because no per-tenant customization UI is being built in this
feature — only the structural readiness for it.

**Independent Test**: Can be tested by overriding a single brand-related
token (e.g., the primary color value) in isolation and confirming components
that reference that token update their appearance accordingly, with no other
token or component needing to change.

**Acceptance Scenarios**:

1. **Given** the token system is in place, **When** the primary brand color
   token is changed to a different value, **Then** every component that
   consumes the primary token (buttons, links, highlighted text/icons)
   reflects the new color without additional code changes.

---

### Edge Cases

- What happens when a "glass" panel is rendered over a background that is
  too light or low-contrast for the blur/translucency to remain legible? The
  system must define a minimum-contrast fallback (e.g., a solid surface) for
  such cases.
- How does the system handle the signature brand gradient in places where
  gradients cannot be rendered (plain text color, disabled controls, email
  templates, print)? A documented solid-color fallback must always be
  available.
- How are semantic state colors (success/warning/danger) distinguished for
  users with color vision deficiency (not relying on color alone)?
- What happens if a future tenant brand-color override produces poor contrast
  against existing text/background tokens? The override mechanism must be
  bounded (e.g., validated or paired with an automatically adjusted
  foreground) rather than allowed to break legibility.
- How does the system behave for users with reduced-motion or
  reduced-transparency OS preferences, given the glass/blur and animated
  "scan-line" signature elements?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The design system MUST define a single source of truth for all
  color values (base/background, surface, text/ink, primary brand, semantic
  success/warning/danger, and border/divider colors) as reusable tokens —
  never as hardcoded hex values inside individual components.
- **FR-002**: The design system MUST define a primary brand treatment based
  on a two-tone gradient, and MUST also define a solid-color fallback for the
  same brand role for contexts where a gradient cannot be applied (e.g., plain
  text, outlines, disabled states).
- **FR-003**: The design system MUST define a typography system with three
  distinct roles — display/heading, body/UI text, and data/mono (timestamps,
  IDs, codes) — each with a defined size and weight scale, applied
  consistently across the dashboard and public-facing pages.
- **FR-004**: The design system MUST define a consistent corner-radius
  language: a larger radius for cards/panels and a fully rounded ("pill")
  shape for buttons and navigation elements.
- **FR-005**: The design system MUST provide a reusable "glass" surface
  treatment (translucent background with blur) restricted to featured/
  highlighted panels (e.g., navigation, check-in card), and MUST NOT be the
  default treatment for ordinary content surfaces, to preserve legibility and
  performance.
- **FR-006**: The design system MUST define semantic colors for confirmed/
  success, pending/warning, and error/danger states, used consistently for
  status indicators, badges, and form feedback across the product.
- **FR-007**: Every shadcn/ui component used in the product MUST be themed
  through the design system's tokens (no component may bypass the tokens with
  one-off hardcoded styling), so visual changes to a token propagate
  consistently everywhere that token is used.
- **FR-008**: The design system MUST present identically (same tokens, same
  component theming) on both the authenticated dashboard and the
  unauthenticated public booking/check-in pages.
- **FR-009**: The design system's brand-related tokens (at minimum, the
  primary color) MUST be structured so a single token value can be
  overridden without modifying component code, in preparation for future
  per-tenant brand customization.
- **FR-010**: The design system MUST default to a light visual theme.

### Key Entities

- **Color Token Set**: The named set of background, surface, text, primary
  (gradient + solid fallback), semantic (success/warning/danger), and
  border/divider colors that all UI surfaces consume.
- **Typography Scale**: The named set of type roles (display, body/UI, data/
  mono) and their associated size/weight pairings.
- **Shape Tokens**: The corner-radius values used for panels/cards versus
  pill-shaped controls (buttons, nav).
- **Glass Surface Treatment**: The translucency + blur styling reserved for
  featured/highlighted panels.
- **Brand Override Token**: The subset of color tokens (primary, at minimum)
  designed to be safely overridden per tenant in a future feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of colors, font sizes/weights, and corner radii used in
  newly built screens come from the defined token set, with zero hardcoded
  hex codes or arbitrary one-off values found in review.
- **SC-002**: All text/background color combinations in the default theme
  meet at least WCAG AA contrast (4.5:1 for normal text, 3:1 for large text).
- **SC-003**: A developer can assemble a new, on-brand screen using only
  existing tokens and shadcn/ui components, with no custom one-off CSS
  required for color, type, or shape decisions.
- **SC-004**: The dashboard and the public booking/check-in surface, when
  reviewed side by side, are judged visually consistent (same palette, type,
  shape language) by a non-technical reviewer with no prompting.
- **SC-005**: Overriding the primary brand color token alone produces a
  correctly re-themed primary button, link, and highlighted text across the
  product, with no other manual changes.

## Assumptions

- The design system targets a light theme only for this feature; dark-mode
  support is out of scope unless explicitly requested later.
- The "glass" translucent treatment is applied selectively (e.g., navigation
  and featured/check-in cards) rather than globally, per the source design
  proposal's explicit guidance to preserve legibility and performance.
- The primary brand role is expressed as both a gradient (for CTAs, avatars,
  highlighted text) and a solid color (for contexts incompatible with
  gradients), since shadcn/ui's component primitives assume solid colors.
- This feature establishes the token system and its application to the
  current (scaffolded, default-themed) shadcn/ui setup; no pre-existing
  custom screens need migration, since none exist yet in the codebase.
  Building per-tenant brand customization UI on top of this is a future,
  separate feature.
- Specific web font delivery/loading mechanics are an implementation detail
  and not specified by this specification.
