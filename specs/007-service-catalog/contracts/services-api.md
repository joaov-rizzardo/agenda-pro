# Contract: Service Catalog API

Base: `/api/workspace/services`. All handlers follow the feature-006 pattern: `try` →
`resolveTenant()` (workspace from session, never from input — Constitution I) → `requireWorkspaceRole`
→ Zod-validate → delegate to `lib/workspace/service-catalog-service.ts` → typed JSON; `catch` →
`errorResponse(error)`. Money fields are plain JSON `number` (reais, 2 decimals — research §1).

Common error shape: `{ "error": string }` (pt-BR) with status `400` (validation), `401` (no
session), `403` (not ACTIVE member / insufficient role), `404` (service not in workspace), `500`.

---

## `GET /api/workspace/services`

List the workspace catalog. **Auth**: any ACTIVE member (OWNER/ADMIN/MEMBER).

**Query** (optional): `?status=ACTIVE|INACTIVE` to filter; omitted → all.

**200**
```json
{
  "services": [
    {
      "serviceId": "clx...",
      "name": "Corte masculino",
      "description": "Inclui lavagem",
      "durationMinutes": 30,
      "defaultPrice": 45.0,
      "status": "ACTIVE",
      "createdAt": "2026-06-30T12:00:00.000Z",
      "updatedAt": "2026-06-30T12:00:00.000Z"
    }
  ]
}
```

---

## `POST /api/workspace/services`

Create a service. **Auth**: OWNER/ADMIN only. Created with `status = ACTIVE` (FR-005).

**Body** (`CreateServiceSchema`)
```json
{
  "name": "Corte masculino",
  "description": "Inclui lavagem",
  "durationMinutes": 30,
  "defaultPrice": 45.0
}
```
Rules: `name` required (min 1, trimmed); `description` optional (→ null); `durationMinutes` integer
> 0 (FR-003); `defaultPrice` number ≥ 0, ≤ 2 decimals (FR-004). Invalid → `400` with pt-BR message.

**201** → `{ "service": ServiceDTO }`

---

## `PATCH /api/workspace/services/[serviceId]`

Edit fields and/or toggle status. **Auth**: OWNER/ADMIN only. Tenant guard: update is scoped
`where: { id: serviceId, workspaceId }`; a `serviceId` from another tenant → `404` (never leaks).

**Body** (`UpdateServiceSchema`, at least one field)
```json
{ "name": "Corte + barba", "durationMinutes": 45, "defaultPrice": 70.0, "status": "INACTIVE" }
```
- Any subset of `name` / `description` / `durationMinutes` / `defaultPrice` / `status`.
- Editing `defaultPrice` automatically changes the effective price for all default-price
  associations (FR-018) — because the price is not copied into join rows.
- `status: "INACTIVE"` removes it from new-association selectors but preserves existing
  associations (FR-008); `"ACTIVE"` re-enables selection (FR-009 — no delete path exists).

**200** → `{ "service": ServiceDTO }`

**Notes**: no `DELETE` endpoint — deletion is intentionally unsupported (FR-009). Duplicate names
are accepted (no uniqueness).
