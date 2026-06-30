# Quickstart & Validation: Cadastro e Gestão de Profissionais

Manual end-to-end validation (no automated suite in this repo). Run each scenario at a **mobile
viewport first** (Constitution IX), then verify `md:+`. All copy must be pt-BR (Constitution X).

## Prerequisites

- Local dev DB (Supabase Postgres) reachable; `.env` has `DATABASE_URL`/`DIRECT_URL`, `AUTH_URL`,
  `RESEND_API_KEY`, `EMAIL_FROM`, plus the **new** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  (server-only). A Supabase Storage public bucket named `avatars` exists.
- Dependencies installed (`@supabase/supabase-js` added): `npm install`.
- Migration applied: `npx prisma migrate dev` (creates the `_add_professionals` migration:
  `MembershipStatus`/`InviteStatus` enums, `WorkspaceInvite`/`Service`/`ProfessionalService`
  models, `WorkspaceMembership.status`/`.jobTitle`).
- At least one workspace with a logged-in **OWNER** (from feature 005).
- `npm run dev` running.

## Validation commands (must pass before "done")

```bash
npx prisma migrate dev        # schema + migration in sync, no drift (Principle VI)
npx tsc --noEmit              # no type errors; no any on API/Prisma boundaries (Principles III/VII)
npm run lint                  # lint clean
npm run build                 # production build succeeds
```

## Scenario 1 — Invite a new (unregistered) professional → P1 / SC-002

1. As OWNER, open **/dashboard/profissionais**, click **Convidar profissional**.
2. Fill nome, e-mail (an address with **no** account), cargo, role = MEMBER; submit.
3. **Expect**: success toast; invite appears in the pending list with status "Pendente" and a
   7-day expiry; an invite e-mail (pt-BR) arrives within ~2 min (SC-001).
4. Open the e-mail link (`/convite/<token>`) while logged out → redirected to **signup** with the
   e-mail prefilled. Complete signup.
5. **Expect**: after signup, account is added to the workspace and, on first login, the workspace
   is listed and accessible on the selection screen with **no extra step** (US1-S4, SC-002). The
   new member shows in the professionals list with role MEMBER + the given cargo, status Ativo.

## Scenario 2 — Invite an existing user → P1 (FR-006)

1. Invite an e-mail that already has an account.
2. Open the link while logged in as that user → "Aceitar convite" screen → accept.
3. **Expect**: added to the workspace with the invited role/cargo; redirected to `/dashboard`;
   appears in the list.

## Scenario 3 — Expiry & resend → SC-003 / FR-005

1. Force-expire a pending invite (set `expiresAt` in the past in DB) and open its link.
2. **Expect**: "convite expirado" state; no acceptance possible.
3. In the pending list, click **Reenviar** on that invite.
4. **Expect**: a new e-mail/link is generated, the old link no longer works, expiry resets to 7d.

## Scenario 4 — Manage members → P2 (FR-008..FR-014)

1. As OWNER, change a MEMBER's role to ADMIN → **Expect** saved, list reflects it without reload
   (SC-004); that user now has ADMIN permissions.
2. As OWNER, edit a member's cargo → **Expect** saved and shown.
3. As OWNER, deactivate a member → **Expect** status Inativo; that user can no longer access the
   workspace (it disappears from their selection screen, FR-022) and is denied on direct access.
4. As **ADMIN**, attempt to change an OWNER's role or status → **Expect** blocked with a pt-BR
   "permissão insuficiente" message (FR-010, SC-005).
5. Attempt to demote/deactivate the **last OWNER** → **Expect** blocked (FR-011).
6. Invite to a duplicate e-mail already an active member → **Expect** "já é membro" rejection
   (FR-004).

## Scenario 5 — Profile photo → P3 (FR-015..FR-017)

1. Upload a valid JPEG/PNG ≤5 MB for a professional → **Expect** photo saved and shown in the
   list/cards.
2. A member without a photo → **Expect** initials avatar fallback.
3. Upload an unsupported type or a >5 MB file → **Expect** descriptive pt-BR error, file rejected
   (US3-S3).

## Scenario 6 — Services placeholder → P4 (FR-019/FR-020, SC-006)

1. Open a professional's profile → **Expect** a "Serviços" section showing an empty state
   ("nenhum serviço configurado / em breve"), no errors, no fake data.
2. Confirm in the DB that `ProfessionalService`/`Service` tables exist (relationship ready for the
   future services module without a schema migration — US4-S2).

## Reference

- Data model: [data-model.md](./data-model.md)
- API contracts: [contracts/members-api.md](./contracts/members-api.md),
  [contracts/invites-api.md](./contracts/invites-api.md),
  [contracts/member-photo-api.md](./contracts/member-photo-api.md),
  [contracts/invite-accept.md](./contracts/invite-accept.md)
- Decisions/rationale: [research.md](./research.md)
