# Phase 1 Data Model: Cadastro e Gestão de Serviços

This feature **extends two existing models** introduced as placeholders by feature 006
(`Service`, `ProfessionalService`). No new tables. One new enum. One additive migration
(`service_catalog`). See `research.md` §1–§4 for the decisions behind each field.

## Enum: `ServiceStatus` (new)

| Value | Meaning |
|-------|---------|
| `ACTIVE` | Selecionável para novas associações; visível como "ativo" (FR-005, FR-007). |
| `INACTIVE` | Não selecionável para novas associações; associações existentes preservadas (FR-008). |

Mirrors the existing `MembershipStatus` convention.

## Model: `Service` (extended)

Existing columns: `id`, `workspaceId`, `name`, `createdAt`, relations `workspace`, `professionals`,
index `@@index([workspaceId])`. **Added by this feature:**

| Field | Type | Rules / Notes |
|-------|------|---------------|
| `description` | `String?` | Optional (FR-002). Trimmed; empty → `null`. |
| `durationMinutes` | `Int` | **Required**, positive integer (FR-003). DB NOT NULL, no default. |
| `defaultPrice` | `Decimal @db.Decimal(10, 2)` | **Required**, `>= 0` (FR-004). Reais; exposed as `number` in DTO (research §1). |
| `status` | `ServiceStatus @default(ACTIVE)` | New services default ACTIVE (FR-005). |
| `updatedAt` | `DateTime @updatedAt` | Tracks last edit. |

- **Tenant scope**: belongs to exactly one `Workspace` via `workspaceId` (already present + indexed)
  — Constitution I satisfied.
- **No hard delete** (FR-009): only `status` transitions ACTIVE ⇄ INACTIVE.
- **Duplicate names allowed** within a workspace — no unique constraint (Assumptions).

### Validation (`lib/validation/service.ts`)

- `CreateServiceSchema`: `name` (trim, min 1), `description` (trim, optional → nullable),
  `durationMinutes` (`z.int().positive()`), `defaultPrice` (`z.number().min(0)`, max 2 decimals).
- `UpdateServiceSchema`: all of the above optional + `status` (`z.enum(["ACTIVE","INACTIVE"])`
  optional); `.refine` at least one field present (mirrors `UpdateMemberSchema`).

### DTO (`ServiceDTO`, from `service-catalog-service.ts`)

```
serviceId, name, description, durationMinutes, defaultPrice (number),
status, createdAt (ISO), updatedAt (ISO)
```

## Model: `ProfessionalService` (extended)

Existing columns: `id`, `membershipId`, `serviceId`, `createdAt`, relations `membership`,
`service`, `@@unique([membershipId, serviceId])`, indexes on both FKs. **Added by this feature:**

| Field | Type | Rules / Notes |
|-------|------|---------------|
| `useCustomPrice` | `Boolean @default(false)` | Flag deciding custom vs default (FR-015, FR-017). Flag — not value — determines custom (edge case: custom == default is still custom). |
| `customPrice` | `Decimal? @db.Decimal(10, 2)` | The override; `null` when `useCustomPrice = false`. `>= 0` when set (FR-016). Nulled on revert (research §4). |

- **Reaches the tenant** through both `membership.workspaceId` and `service.workspaceId`; writes
  re-verify both resolve to the session workspace (research §5, Constitution I/VIII).
- `@@unique([membershipId, serviceId])` prevents duplicate associations.
- **Default price is never copied here** — reads join the live `Service.defaultPrice` so catalog
  price changes propagate automatically to default-price associations (FR-018 / SC-004).

### Validation (`lib/validation/service.ts`)

- `AssociateServiceSchema`: `{ serviceId: z.string().min(1) }` (POST body). Server rejects if the
  service is INACTIVE or not in the workspace.
- `SetCustomPriceSchema`: `{ useCustomPrice: z.boolean(), customPrice: z.number().min(0).optional() }`
  with `.refine`: when `useCustomPrice === true`, `customPrice` MUST be present (≥ 0); when `false`,
  `customPrice` is ignored/nulled.

### Derived value (`lib/pricing/effective-price.ts`)

```
resolveEffectivePrice({ useCustomPrice, customPrice, defaultPrice }) =
  useCustomPrice && customPrice != null ? customPrice : defaultPrice
```

### DTO (`AssociatedServiceDTO`, from `professional-service-service.ts`)

```
associationId, serviceId, name, durationMinutes,
defaultPrice (number), useCustomPrice, customPrice (number | null),
effectivePrice (number, derived), serviceStatus (ACTIVE | INACTIVE)  // for the inativo badge (FR-014)
```

## Relationships (unchanged, now meaningful)

```
Workspace 1───* Service
Service   1───* ProfessionalService *───1 WorkspaceMembership (professional)
```

A professional has 0..N services; a service has 0..N professionals; the join row carries the
per-professional pricing override.

## State transitions

- **Service.status**: `ACTIVE ⇄ INACTIVE` (FR-007). No delete (FR-009). Deactivation does not
  cascade to existing associations (FR-008/FR-014).
- **ProfessionalService pricing**: `default (useCustomPrice=false, customPrice=null)` ⇄
  `custom (useCustomPrice=true, customPrice=v≥0)` (FR-015/FR-017).

## Prisma schema delta (for reference — final form written during implementation)

```prisma
enum ServiceStatus {
  ACTIVE
  INACTIVE
}

model Service {
  // ...existing: id, workspaceId, name, createdAt, workspace, professionals, @@index([workspaceId])
  description     String?
  durationMinutes Int
  defaultPrice    Decimal        @db.Decimal(10, 2)
  status          ServiceStatus  @default(ACTIVE)
  updatedAt       DateTime       @updatedAt
}

model ProfessionalService {
  // ...existing: id, membershipId, serviceId, createdAt, relations, @@unique, @@index
  useCustomPrice Boolean  @default(false)
  customPrice    Decimal? @db.Decimal(10, 2)
}
```
