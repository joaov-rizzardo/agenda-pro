# Quickstart & Validation: Cadastro e Gestão de Serviços

Manual validation guide (no automated suite in this repo — Constitution: tests only when the spec
requests them). Run against a local dev server with a seeded workspace where you are OWNER or ADMIN.
Details live in [data-model.md](./data-model.md), [contracts/](./contracts/), and
[research.md](./research.md); this file is the runnable walk-through.

## Prerequisites

- Node + the repo installed; `.env` with `DATABASE_URL` (Supabase/Postgres) and NextAuth vars set.
- Logged in as an OWNER/ADMIN of a workspace (see `app/dashboard/profissionais` to confirm role).
- At least one other ACTIVE professional in the workspace (to test association + custom price).

## Setup

```bash
# 1. Extend the schema (Service + ProfessionalService columns, ServiceStatus enum) — additive.
#    Guard: confirm the placeholder tables are empty before applying NOT NULL columns (research §2):
#    e.g. SELECT count(*) FROM "Service"; SELECT count(*) FROM "ProfessionalService";  → expect 0
npx prisma migrate dev --name service_catalog

# 2. Regenerate the client (also runs on postinstall)
npx prisma generate

# 3. Start the app
npm run dev
```

Open `http://localhost:3000/dashboard/servicos`.

## Scenario 1 — Catalog CRUD (P1 / US1, FR-001…FR-010, SC-001/002/006)

1. Click **Novo serviço**. Submit empty → validation blocks with pt-BR messages for nome, duração,
   preço (SC-006, acceptance 2).
2. Enter nome, descrição, duração `30`, preço `45,00` → save. Expect: appears in the list as
   **ativo** with duração + preço, no manual reload (SC-002, acceptance 1). Should take < 1 min
   (SC-001).
3. Try duração `0` / `-5` and preço `-1` → each rejected (edge cases, SC-006).
4. Edit the service (nome/descrição/duração/preço) → changes reflected immediately in the list
   (acceptance 3).
5. Toggle status → **inativo**; then back to **ativo** (acceptance 4/5). Confirm no delete action
   exists anywhere (FR-009).

**Expected**: `GET/POST /api/workspace/services`, `PATCH /api/workspace/services/[serviceId]` behave
per [contracts/services-api.md](./contracts/services-api.md).

## Scenario 2 — Associate services to a professional (P2 / US2, FR-011…FR-014, SC-003/005)

1. Open another professional's profile (`/dashboard/profissionais` → member). The **Serviços**
   section is now a real selector (was the empty placeholder).
2. The selector lists only **ACTIVE** services (FR-011). Select one → save. It appears associated,
   showing the **default price** (FR-013, acceptance 1). ≤ 3 interactions (SC-003).
3. Remove the association → disappears from this professional only; the catalog and other
   professionals are unaffected (FR-012, acceptance 2).
4. **Deactivation survival (SC-005)**: associate an active service, then in `/dashboard/servicos`
   set that service to **inativo**. Return to the professional → the association is **still listed**,
   flagged **inativo** (FR-014, acceptance 3), and can still be removed manually.

**Expected**: endpoints under
[contracts/professional-services-api.md](./contracts/professional-services-api.md).

## Scenario 3 — Per-professional custom price (P3 / US3, FR-015…FR-018, SC-004)

1. On an associated service using the default price, enable **preço personalizado** and enter a
   different value → applies to this professional only; `Service.defaultPrice` and other
   professionals unchanged (acceptance 1).
2. **Catalog price change propagation (SC-004 / FR-018)**: with professional A on default price and
   professional B on custom price, edit the service's `defaultPrice` in `/dashboard/servicos`. Expect:
   A's effective price updates to the new default automatically; B's custom price is unchanged
   (acceptance 3).
3. Disable the custom price ("usar preço padrão") → effective price returns to the current default;
   `customPrice` is nulled server-side (acceptance 2, research §4).
4. Edge: set a custom price **equal to** the default → accepted, still treated as custom until
   reverted.

## Tenant-isolation checks (Constitution I — priority manual scenarios)

- With DevTools, call `PATCH /api/workspace/services/<id-from-another-workspace>` → expect `404`,
  not a silent success (catalog update scoped `where: { id, workspaceId }`).
- `POST /api/workspace/members/<memberId>/services` with a `serviceId` from another workspace →
  `404`; associating an INACTIVE service → `400`; duplicate association → `409`.
- As a MEMBER (non OWNER/ADMIN), attempt any mutation → `403`; reads succeed.

## Done when

- All three scenarios pass, catalog price changes propagate correctly (SC-004), no association is
  lost on deactivation (SC-005), tenant-isolation checks return the expected 4xx, and
  `npx tsc --noEmit` + `npm run lint` pass (Constitution quality gate).
