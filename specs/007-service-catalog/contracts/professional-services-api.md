# Contract: Professional↔Service Association API

Base: `/api/workspace/members/[membershipId]/services`. Same handler pattern as the catalog API.
**Tenant guard (Constitution I/VIII)**: every handler re-verifies that `membershipId` belongs to the
session workspace, and that the target `serviceId` also belongs to the session workspace, before
touching the join row — a caller cannot cross tenants in either direction. Money = JSON `number`.

Common error shape: `{ "error": string }` (pt-BR); `400` validation, `401` no session, `403`
role/membership, `404` membership or service not in workspace, `409` conflict (already associated),
`500`.

---

## `GET /api/workspace/members/[membershipId]/services`

List services associated to a professional. **Auth**: any ACTIVE member. Includes associations whose
service is now INACTIVE, flagged via `serviceStatus` (FR-014) — reads do **not** filter by status.

**200**
```json
{
  "services": [
    {
      "associationId": "clx...",
      "serviceId": "clx...",
      "name": "Corte masculino",
      "durationMinutes": 30,
      "defaultPrice": 45.0,
      "useCustomPrice": true,
      "customPrice": 60.0,
      "effectivePrice": 60.0,
      "serviceStatus": "ACTIVE"
    }
  ]
}
```
`effectivePrice = useCustomPrice && customPrice != null ? customPrice : defaultPrice` (research §4).

---

## `POST /api/workspace/members/[membershipId]/services`

Associate an **active** service, using the default price (FR-013). **Auth**: OWNER/ADMIN.

**Body** (`AssociateServiceSchema`)
```json
{ "serviceId": "clx..." }
```
Rules / guards:
- `serviceId` MUST resolve to a service in the session workspace → else `404`.
- Service MUST be `ACTIVE` → else `400` ("Serviço inativo não pode ser associado.") (FR-011).
- Association MUST NOT already exist (`@@unique([membershipId, serviceId])`) → else `409`.
- Row created with `useCustomPrice = false`, `customPrice = null` (default price applies).

**201** → `{ "service": AssociatedServiceDTO }`

---

## `PATCH /api/workspace/members/[membershipId]/services/[serviceId]`

Enable/disable the per-professional custom price (US3). **Auth**: OWNER/ADMIN.

**Body** (`SetCustomPriceSchema`)
```json
{ "useCustomPrice": true, "customPrice": 60.0 }
```
Rules:
- `useCustomPrice: true` → `customPrice` required, number ≥ 0, ≤ 2 decimals (FR-016). Overrides the
  default for this professional only; does not change `Service.defaultPrice` or other professionals
  (FR-015). A `customPrice` equal to `defaultPrice` is accepted and still treated as custom.
- `useCustomPrice: false` → revert to default; server sets `customPrice = null` (FR-017, research §4).
- Guarded by the same membership+service workspace re-verification; association must exist → else
  `404`.

**200** → `{ "service": AssociatedServiceDTO }`

---

## `DELETE /api/workspace/members/[membershipId]/services/[serviceId]`

Remove the association. **Auth**: OWNER/ADMIN. Deletes only the join row — does not affect the
service in the catalog or other professionals (FR-012). Works even if the service is INACTIVE
(lets the user clean up a deactivated-service association per FR-014).

**200** → `{ "success": true }` (or `204`). Non-existent association → `404`.
