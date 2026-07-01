# Phase 0 Research: Cadastro e Gestão de Serviços

All open decisions for feature 007. There were no `NEEDS CLARIFICATION` markers left in Technical
Context; the items below record the design choices that ground the plan.

## §1. Money representation (preço padrão / preço personalizado)

- **Decision**: Store as PostgreSQL `Decimal @db.Decimal(10, 2)` via Prisma; expose as `number`
  (reais, 2 decimals) in every DTO by converting with `Number(value)` (or `value.toNumber()`) at
  the service-layer boundary. Accept as `number` in Zod input.
- **Rationale**: `Decimal(10,2)` stores exact currency (no binary float drift) and supports values
  up to R$ 99.999.999,99 — far beyond any realistic single-service price. Prisma returns a
  `Decimal` object, which does not serialize cleanly to JSON; converting to `number` once, in the
  DTO mapper (mirroring `toDTO` in `member-service.ts`), keeps the API contract a plain JSON number
  and keeps rounding centralized. At 2 decimal places and this magnitude the value is well within
  IEEE-754 integer-safe range, so the client-facing `number` is lossless.
- **Alternatives considered**:
  - *Integer centavos (`Int`)*: avoids Decimal entirely and is float-safe, but pushes ÷100/×100
    conversions into every read/write and every UI formatter, and diverges from how a human enters
    "89,90". Rejected as more error-prone for no real benefit at this scale.
  - *Prisma `Decimal` all the way to the client*: leaks a non-JSON type across the API boundary and
    forces `decimal.js` on the client. Rejected — the contract must be plain JSON (Constitution III).
- **Validation**: `z.number().min(0)` with a `.multipleOf(0.01)`-style guard (or round to 2 dp in
  the service) so more than 2 decimal places is rejected/normalized. Applies identically to
  `defaultPrice` and `customPrice` (FR-016).
- **Formatting**: display with `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`
  in a small presentational `service-price.tsx` helper (Constitution X — pt-BR, R$).

## §2. Extending the placeholder models with NOT NULL columns

- **Decision**: Add `durationMinutes Int` and `defaultPrice Decimal @db.Decimal(10,2)` as NOT NULL
  **without** a persisted column default, plus `status ServiceStatus @default(ACTIVE)`,
  `description String?`, and `updatedAt DateTime @updatedAt`. Ship as one additive
  `prisma migrate dev --name service_catalog` migration. On `ProfessionalService` add
  `useCustomPrice Boolean @default(false)` and `customPrice Decimal? @db.Decimal(10,2)` (nullable).
- **Rationale**: `Service` and `ProfessionalService` were introduced by feature 006 purely as
  forward-compatible placeholders (the 006 plan explicitly states "the future services module needs
  no schema migration for that link" and calls `Service` "a minimal forward-compatible placeholder
  (additive columns later, no destructive migration)"). They hold no rows in any environment, so
  adding NOT NULL columns with no default is safe and does not require a backfill. Keeping them NOT
  NULL enforces FR-002/FR-003/FR-004 at the database level.
- **Guard**: Before applying, confirm both tables are empty (`SELECT count(*)`); if any environment
  unexpectedly has rows, add a one-time default or backfill step. Documented in `quickstart.md`.
- **Alternatives considered**: making the new columns nullable to be "migration-safe" — rejected
  because it weakens the required-field invariant and would force defensive null-handling
  everywhere for a table known to be empty.

## §3. Service status: enum vs boolean

- **Decision**: New enum `ServiceStatus { ACTIVE, INACTIVE }` with `@default(ACTIVE)`, mirroring the
  existing `MembershipStatus { ACTIVE, INACTIVE }`.
- **Rationale**: Consistency with the established status pattern (labels, badges, toggle UI already
  exist for `MembershipStatus` and can be mirrored), and room to add states later (e.g. `ARCHIVED`)
  without a boolean→enum migration. FR-005 (new services default ACTIVE) maps directly to the enum
  default.
- **Alternatives considered**: `active Boolean @default(true)` — simpler but inconsistent with the
  codebase's status convention and less extensible. Rejected.

## §4. Effective-price resolution (default vs custom)

- **Decision**: A pure helper `resolveEffectivePrice({ useCustomPrice, customPrice, defaultPrice })`
  in `lib/pricing/effective-price.ts` returns `useCustomPrice && customPrice != null ? customPrice
  : defaultPrice`. The `AssociatedServiceDTO` carries `defaultPrice`, `useCustomPrice`,
  `customPrice`, and a derived `effectivePrice` computed via this helper at the service layer.
- **Rationale**: FR-018/SC-004 require that default-price associations always reflect the *current*
  catalog price and custom-price associations never do. Because the default price is **not copied**
  into the join row (only `customPrice` is stored, and only when `useCustomPrice` is true),
  reflecting a catalog price change is automatic — the read joins the live `Service.defaultPrice`.
  A single pure helper keeps the rule testable and reused identically on any future surface (e.g.
  booking), per Constitution VII.
- **Reverting to default** (FR-017): set `useCustomPrice = false`. Keep or null `customPrice` — the
  decision is to **null it out** on revert so the row has no stale value; re-enabling asks for a
  fresh value. Edge case "custom price equal to default is still treated as custom" (spec) is honored
  because the flag, not the value, determines custom vs default.

## §5. Association route shape & authorization

- **Decision**: Nest association endpoints under the member:
  `GET/POST /api/workspace/members/[membershipId]/services` and
  `PATCH/DELETE /api/workspace/members/[membershipId]/services/[serviceId]`. Reads allowed to any
  ACTIVE member; writes restricted to OWNER/ADMIN via `requireWorkspaceRole`. Every handler
  re-verifies that the `membershipId` **and** the `serviceId` belong to the session workspace before
  touching the join row.
- **Rationale**: The URL makes the tenant→member→service scope explicit and reuses the existing
  `members/[membershipId]/...` authorization pattern from 006 (see `members/[membershipId]/photo`).
  Re-verifying both foreign keys against the session workspace closes the cross-tenant write vector
  (Constitution I/VIII) — a caller cannot associate their member to another tenant's service or
  vice-versa.
- **Active-only for new associations** (FR-008/FR-011): the association `POST` rejects a service
  whose `status = INACTIVE`; the selector UI only lists ACTIVE services. Already-associated services
  that are later deactivated remain in the member's list, flagged inativo (FR-014) — the read does
  **not** filter associations by service status.

## §6. Reuse map (no new dependency)

| Need | Reuse from feature 006 |
|------|------------------------|
| Tenant + session resolution | `lib/workspace/api-context.ts` (`resolveTenant`, `errorResponse`) |
| Role gate | `lib/workspace/authorization.ts` (`requireWorkspaceRole`, `WorkspaceAuthError`) |
| Route Handler shape | `app/api/workspace/members/route.ts` (try/`resolveTenant`/gate/service/typed JSON) |
| DTO mapping pattern | `toDTO` in `lib/workspace/member-service.ts` |
| Client fetch helper | `lib/api-request.ts` (`apiRequest`) |
| React Query hook shape | `hooks/professionals/use-members.ts` |
| Page guard | `app/dashboard/profissionais/page.tsx` (session + ACTIVE membership + role) |
| UI primitives | `components/ui/*` (Table, Card, Dialog, Select, Badge, Switch, Input, Label, Button, Sonner) |

**Output**: All decisions resolved; no blocking unknowns remain. Proceed to Phase 1.
