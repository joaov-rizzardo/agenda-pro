# Tasks: Cadastro e Gestão de Profissionais

**Input**: Design documents from `/specs/006-professional-registration/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: No automated tests — spec does not request them and no test suite exists in this repo (Constitution / plan.md §Testing).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies, add shadcn primitives, wire up the React Query provider.

- [X] T001 Install `@supabase/supabase-js` dependency — run `npm install @supabase/supabase-js`
- [X] T002 [P] Add missing shadcn primitives via CLI: `dialog`, `select`, `dropdown-menu`, `table`, `avatar`, `sonner`, `switch` — run `npx shadcn@latest add <primitive>` for each
- [X] T003 [P] Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_*`) to `.env.example`
- [X] T004 Create `app/providers.tsx` — `"use client"` component that instantiates a memoized `QueryClient` and wraps children in `<QueryClientProvider>` (research.md §4)
- [X] T005 Update `app/layout.tsx` — import `<Providers>` from `app/providers.tsx` and wrap `{children}` (Constitution VII)

**Checkpoint**: React Query provider in place, shadcn primitives installed — no UI built yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration, shared services, and design gate. ALL must complete before any user story work begins.

**⚠️ CRITICAL**: No user story implementation can start until this phase is complete.

- [X] T006 Update `prisma/schema.prisma` — add `MembershipStatus` + `InviteStatus` enums; add `status`/`jobTitle` columns to `WorkspaceMembership`; add `WorkspaceInvite`, `Service`, `ProfessionalService` models; add `invitesSent` back-relation on `User`; add `services` back-relation on `WorkspaceMembership` (data-model.md)
- [X] T007 Run `npx prisma migrate dev --name add_professionals` — generates `prisma/migrations/<ts>_add_professionals/migration.sql`; confirm no drift with `npx prisma migrate status`
- [X] T008 [P] Create `lib/validation/professional.ts` — Zod schemas: `CreateInviteSchema` (email, name?, role, jobTitle?), `UpdateMemberSchema` (partial role/status/jobTitle, ≥1 field required); all error messages in pt-BR (data-model.md §Validation, Constitution III/X)
- [X] T009 [P] Create `lib/workspace/authorization.ts` — `requireWorkspaceRole(userId, workspaceId, allowedRoles[])` → returns the caller's `WorkspaceMembership` (status ACTIVE) or throws typed 401/403; used by every professional Route Handler (research.md §5, Constitution I/V)
- [X] T010 Update `lib/workspace/workspace-service.ts` — filter `WorkspaceMembership` by `status = ACTIVE` in `resolveWorkspaceRoute` and any workspace-selection query so INACTIVE members can't access the workspace (FR-013/FR-022, research.md §5)
- [X] T011 Run `/frontend-design` skill — mobile-first composition design for: professionals screen (card list mobile / table `md:+`), invite dialog, member row/edit controls (role select, status toggle), professional-photo-uploader, and invite-accept card; output design decisions before any UI task begins (Constitution IV/IX gate — blocks T019, T021, T022, T028–T032, T037, T038)

**Checkpoint**: Schema migrated, Prisma types generated, authorization helper ready, design decisions documented — user story implementation can now begin.

---

## Phase 3: User Story 1 — Convidar Profissional (Priority: P1) 🎯 MVP

**Goal**: OWNER/ADMIN sends an invite email; the invitee accepts via a tokenized link and is added to the workspace (existing user: direct; new user: after signup flow). Invite list with resend/cancel shown on the professionals screen.

**Independent Test**: Send an invite to an unregistered email → complete signup via the link → confirm the professional appears in the team list (quickstart.md Scenarios 1 & 2).

### Implementation for User Story 1

- [X] T012 [US1] Create `lib/email/send-invite-email.ts` — pt-BR invite email via Resend: subject line, invite details (workspace name, invited role, cargo), link `${AUTH_URL}/convite/<rawToken>`; mirrors `lib/email/` verification pattern (research.md §1, Constitution X)
- [X] T013 [US1] Create `lib/workspace/invite-service.ts` — `createInvite` (tokenHash = sha256 of `randomBytes(32).hex`, expiresAt now+7d, reject if ACTIVE membership exists for email — FR-004), `resendInvite` (cancel prior PENDING/EXPIRED row, create fresh row + send email), `cancelInvite` (set CANCELLED), `acceptInvite` (idempotent: find-or-create ACTIVE membership with invited role+jobTitle, set emailVerified if new user, mark ACCEPTED, set acceptedAt); lazy expiry check at read/accept time (research.md §1/§2, FR-001–FR-007)
- [X] T014 [P] [US1] Create `app/api/workspace/invites/route.ts` — `GET` list invites (OWNER/ADMIN, default PENDING+EXPIRED), `POST` create invite (Zod `CreateInviteSchema`, OWNER-only for role ADMIN/OWNER per FR-009, 409 if already a member); uses T009 + T013 + T008; typed JSON responses, pt-BR errors (contracts/invites-api.md, Constitution III)
- [X] T015 [P] [US1] Create `app/api/workspace/invites/[inviteId]/route.ts` — `POST` resend invite (OWNER/ADMIN, re-scoped to active workspace), `DELETE` cancel invite; reads async `params` per Next 16 docs (`node_modules/next/dist/docs/01-app/`); uses T013 + T009 (contracts/invites-api.md, research.md §8)
- [X] T016 [P] [US1] Create `hooks/professionals/use-invites.ts` — React Query hooks: `useInvites`, `useCreateInvite`, `useResendInvite`, `useCancelInvite`; mutations invalidate `["invites"]` key; no `useEffect`+`fetch` (Constitution VII)
- [X] T017 [P] [US1] Create `app/actions/invite.ts` — `acceptInvite(token)` Server Action: re-derive invite from tokenHash, verify PENDING+not-expired, match session user email to invite email, transaction (find-or-create ACTIVE membership, set emailVerified if new, mark ACCEPTED+acceptedAt), `unstable_update({ user: { activeWorkspaceId } })`, `redirect("/dashboard")` (contracts/invite-accept.md, research.md §2, Constitution I)
- [X] T018 [US1] Create `app/(workspace)/convite/[token]/page.tsx` — public Server Component (NOT under `/dashboard`); reads token → validate invite → render one of: invalid/expired card, accept button (logged in as invite email's user), redirect to `/login?callbackUrl=…`, redirect to `/signup?invite=<token>`, or "logged in as wrong account" notice; all copy pt-BR (contracts/invite-accept.md, research.md §2, Constitution X)
- [X] T019 [P] [US1] Create `components/invite/accept-invite-card.tsx` — shadcn Card with pt-BR states: valid (workspace name, role, cargo, accept button), invalid/expired/cancelled/already-accepted, "wrong account" notice; mobile-first per T011 design decisions (Constitution IV/IX/X)
- [X] T020 [US1] Update `app/(auth)/signup/page.tsx` (and related action/form files) — read `?invite=<token>` from URL, prefill and lock email field to invite email, on successful account creation invoke `acceptInvite(token)` instead of standard verify-email detour (research.md §2, SC-002, Constitution II/X)
- [X] T021 [P] [US1] Create `components/professionals/invite-professional-dialog.tsx` — shadcn Dialog with form: fields nome (optional), email, cargo (optional), role select (OWNER/ADMIN/MEMBER; OWNER-only options per FR-009); calls `useCreateInvite`; pt-BR labels + validation messages; mobile-first per T011 design (Constitution IV/VII/IX/X)
- [X] T022 [P] [US1] Create `components/professionals/pending-invites-list.tsx` — lists PENDING and EXPIRED invites from `useInvites`; each row shows email, role, cargo, status badge, expiry date, Reenviar button (calls `useResendInvite`) and Cancelar button (calls `useCancelInvite`); pt-BR copy; mobile card / `md:+` table row per T011 design (Constitution IV/IX/X)
- [X] T023 [US1] Update `app/dashboard/profissionais/page.tsx` — Server Component: fetch initial invites list server-side; pass as `initialData` to `ProfessionalsView`; renders invite dialog trigger + pending invites section (Constitution II, research.md §4)

**Checkpoint**: US1 fully functional — invite flow end-to-end works (Scenarios 1, 2, 3 from quickstart.md), pending invites visible on professionals screen with resend/cancel.

---

## Phase 4: User Story 2 — Gerenciar Profissionais (Priority: P2)

**Goal**: OWNER/ADMIN can view the full member list with role/status/jobTitle/photo and edit them inline; server-enforced guards (ADMIN can't touch OWNER; last OWNER can't be demoted/deactivated).

**Independent Test**: Change a MEMBER's role to ADMIN and verify it reflects without page reload; attempt ADMIN→OWNER edit from an ADMIN account and confirm it's blocked (quickstart.md Scenario 4, SC-004/SC-005).

### Implementation for User Story 2

- [X] T024 [US2] Create `lib/workspace/member-service.ts` — `listMembers(workspaceId)`: join membership→user, return full member shape; `updateMember(callerId, workspaceId, membershipId, data)`: enforce ADMIN-can't-modify-OWNER (FR-010), OWNER-only for setting role ADMIN/OWNER (FR-009 parity), last-ACTIVE-OWNER guard (FR-011, count active OWNERs before change); typed 403 + pt-BR message on violation (research.md §5, Constitution VII)
- [X] T025 [P] [US2] Create `app/api/workspace/members/route.ts` — `GET` list members (any ACTIVE member may read); resolves session + workspaceId from `session.user.activeWorkspaceId`; calls T009 + T024; typed JSON per contracts/members-api.md (Constitution I/III)
- [X] T026 [P] [US2] Create `app/api/workspace/members/[membershipId]/route.ts` — `PATCH` update member (OWNER/ADMIN only); Zod `UpdateMemberSchema`; re-scopes `membershipId` to active workspace (404 if not found); delegates to T024; async `params` per Next 16 docs; pt-BR error messages (contracts/members-api.md, research.md §8)
- [X] T027 [P] [US2] Create `hooks/professionals/use-members.ts` — React Query hooks: `useMembers`, `useUpdateMember`; mutation invalidates `["members"]` key for SC-004 (no manual reload); no `useEffect`+`fetch` (Constitution VII)
- [X] T028 [P] [US2] Create `components/professionals/professional-avatar.tsx` — shadcn `<Avatar>` + `<AvatarImage>` (photo URL from `User.image`) + `<AvatarFallback>` (initials from firstName+lastName); FR-017 (Constitution IV/VII)
- [X] T029 [P] [US2] Create `components/professionals/member-role-select.tsx` — shadcn `<Select>` for role (OWNER/ADMIN/MEMBER); calls `useUpdateMember`; disables ADMIN/OWNER options when caller is not OWNER; disabled entirely when editing an OWNER (FR-009/FR-010); pt-BR option labels (Constitution IV/VII/X)
- [X] T030 [P] [US2] Create `components/professionals/member-status-toggle.tsx` — shadcn `<Switch>` for ACTIVE/INACTIVE; calls `useUpdateMember`; disabled when target is OWNER and caller is ADMIN (FR-014); pt-BR aria label + status badge (Constitution IV/VII/X)
- [X] T031 [US2] Create `components/professionals/professional-list-item.tsx` — mobile card / `md:+` table row per T011 design; renders T028 avatar, name, email, jobTitle, role (T029), status (T030); one component per file (Constitution VII/IX)
- [X] T032 [US2] Create `components/professionals/professionals-view.tsx` — `"use client"` list container; consumes `useMembers` with `initialData` from Server Component props; consumes `useInvites` with invite initialData; renders list of T031 items + T022 pending invites + invite dialog trigger (T021); Sonner toasts on mutation success/error; pt-BR empty state (Constitution II/VII/IX/X)
- [X] T033 [US2] Update `app/dashboard/profissionais/page.tsx` — fetch members + invites server-side; pass both as `initialData` to `<ProfessionalsView>`; first paint is server-rendered (Constitution II, research.md §4)

**Checkpoint**: US1 + US2 both functional — member list shows all professionals with inline role/status/jobTitle editing and server-enforced guards.

---

## Phase 5: User Story 3 — Foto de Perfil (Priority: P3)

**Goal**: Upload JPEG/PNG ≤5 MB via a Route Handler → Supabase Storage `avatars` bucket → persist public URL on `User.image`; initials avatar fallback when no photo.

**Independent Test**: Upload a valid image and confirm it appears in the member list cards; attempt >5 MB or wrong format and confirm pt-BR rejection error (quickstart.md Scenario 5).

### Implementation for User Story 3

- [X] T034 [US3] Create `lib/supabase/storage.ts` — server-only (`import 'server-only'`) Supabase client using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; exports `uploadAvatar(userId, file): Promise<string>` — uploads to `avatars/<userId>.<ext>` with `upsert: true`, returns the public URL; never imported by `"use client"` code (research.md §3, Constitution V/VI)
- [X] T035 [US3] Create `app/api/workspace/members/[membershipId]/photo/route.ts` — `POST` multipart; parse `FormData` per Next 16 docs; validate `file` present, MIME ∈ `{image/jpeg,image/png}`, size ≤ 5 MB (422 + pt-BR error on failure); authorize: self OR OWNER/ADMIN (403 otherwise); call T034 `uploadAvatar`; update `User.image` via Prisma; return `{ image: url }`; typed errors, no `any` (contracts/member-photo-api.md, research.md §3/§8, Constitution III)
- [X] T036 [P] [US3] Create `hooks/professionals/use-upload-member-photo.ts` — React Query mutation hook `useUploadMemberPhoto`; posts `FormData` to `/api/workspace/members/[membershipId]/photo`; on success invalidates `["members"]` key so updated avatar appears without reload (Constitution VII)
- [X] T037 [US3] Create `components/professionals/professional-photo-uploader.tsx` — file input (accept `image/jpeg,image/png`); client-side pre-validation (type + size) before upload for immediate feedback; calls T036 mutation; progress/error/success states with pt-BR messages; mobile-first per T011 design; wire into T031 list item or a profile drawer (Constitution IV/VII/IX/X)

**Checkpoint**: US1 + US2 + US3 fully functional — photo upload and initials fallback both work.

---

## Phase 6: User Story 4 — Estrutura de Serviços (Priority: P4)

**Goal**: `Service` + `ProfessionalService` models already exist in the schema (T006/T007). Add the "Serviços" empty-state UI section on the professional profile so the screen is ready for the services module without a future schema migration.

**Independent Test**: Open a professional's profile view → confirm "Serviços" section renders with an empty-state message (no errors, no fake data), and `ProfessionalService`/`Service` tables exist in the DB (quickstart.md Scenario 6, SC-006).

### Implementation for User Story 4

- [X] T038 [P] [US4] Create `components/professionals/professional-services-section.tsx` — empty-state section "Serviços" with pt-BR copy ("Nenhum serviço configurado. A configuração de serviços estará disponível em breve."); uses shadcn Card or a simple section element; no data fetching (FR-020, SC-006, Constitution X)
- [X] T039 [US4] Integrate `<ProfessionalServicesSection>` into `components/professionals/professionals-view.tsx` or a professional profile drawer — render below member details; confirm no errors when `ProfessionalService` rows are empty (US4-S1)

**Checkpoint**: All four user stories functional. SC-006 satisfied.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Type-check, lint, build, and manual validation across all stories.

- [X] T040 [P] Run `npx tsc --noEmit` — zero type errors; no `any`/unnarrowed `unknown` on API/Prisma boundaries (Constitution III/VII)
- [X] T041 [P] Run `npm run lint` — lint clean across all new files
- [X] T042 Run `npm run build` — production build succeeds with no errors
- [ ] T043 Manual validation per `quickstart.md` — run Scenarios 1–6 at mobile viewport first then `md:+`; all pt-BR copy, all server guards confirmed (Constitution IX/X)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. T001/T002/T003 parallel; T004 after T001; T005 after T004.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. T006 → T007 → (T008 [P], T009 [P], T010) in parallel. **T011 (design gate) blocks all UI tasks** in Phases 3–6.
- **US1 (Phase 3)**: All depend on Phase 2. T012 → T013 → (T014 [P], T015 [P], T016 [P], T017 [P]) → T018 → T019 [P] → T020 → (T021 [P], T022 [P]) → T023.
- **US2 (Phase 4)**: Depends on Phase 2 + T023 (professionals page base). T024 → (T025 [P], T026 [P]) then (T027 [P], T028 [P], T029 [P], T030 [P]) → T031 → T032 → T033.
- **US3 (Phase 5)**: Depends on Phase 2 + T028 (avatar component). T034 → T035 → (T036 [P]) → T037.
- **US4 (Phase 6)**: Depends on T032 (professionals-view) and T007 (schema). T038 [P] → T039.
- **Polish (Phase 7)**: Depends on all prior phases. T040 [P] and T041 [P] can run in parallel; T042 after both; T043 after T042.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on US2/US3/US4.
- **US2 (P2)**: Starts after Phase 2 and after T023 (professionals page established by US1).
- **US3 (P3)**: Starts after Phase 2. T034–T037 isolated in their own files; integrates into existing avatar (T028) and list item (T031).
- **US4 (P4)**: Starts after T007 (schema) and T032 (professionals-view). Fully isolated UI addition.

### Within Each User Story

- Services/helpers before Route Handlers
- Route Handlers before React Query hooks (hooks need API shape)
- Server Actions before pages that reference them
- Components before the view that composes them
- View before the server page that renders it

---

## Parallel Execution Examples

### Phase 2 (after T007)
```
In parallel: T008 (lib/validation/professional.ts)
             T009 (lib/workspace/authorization.ts)
             T010 (lib/workspace/workspace-service.ts update)
             T011 (/frontend-design skill)
```

### Phase 3 / US1 (after T013)
```
In parallel: T014 (app/api/workspace/invites/route.ts)
             T015 (app/api/workspace/invites/[inviteId]/route.ts)
             T016 (hooks/professionals/use-invites.ts)
             T017 (app/actions/invite.ts)
```

### Phase 4 / US2 (after T024, T011)
```
In parallel: T027 (hooks/professionals/use-members.ts)
             T028 (components/professionals/professional-avatar.tsx)
             T029 (components/professionals/member-role-select.tsx)
             T030 (components/professionals/member-status-toggle.tsx)
```

---

## Implementation Strategy

### MVP First (US1 Only — Phases 1, 2, 3)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T011) — **critical path**
3. Complete Phase 3: US1 (T012–T023)
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1–3 at mobile viewport
5. Deploy/demo invite flow

### Incremental Delivery

1. Phases 1–2 → Foundation ready
2. Phase 3 (US1) → Invite flow end-to-end → validate → deploy (MVP)
3. Phase 4 (US2) → Member management → validate → deploy
4. Phase 5 (US3) → Photo upload → validate → deploy
5. Phase 6 (US4) → Services placeholder → validate → deploy
6. Phase 7 → Full validation pass

### Parallel Team Strategy

- Developer A: Phase 3 (US1) after Phase 2
- Developer B: Phase 4 (US2 services + handlers) in parallel with Developer A on UI
- Developer C: Phase 5 (US3 photo) after T007

---

## Notes

- `[P]` = different files, no in-flight dependencies — safe to parallelize
- `[Story]` maps each task to its user story for independent traceability
- **T011** (frontend-design skill) is a hard gate: no UI implementation starts before it produces design decisions (Constitution IV/IX)
- **No shadcn custom primitives**: use installed shadcn components only; never hand-roll dialog/select/table equivalents (Constitution VIII)
- **pt-BR always**: every user-facing string in every component and email ships in pt-BR from the first commit; no English placeholder copy in user-facing surfaces (Constitution X)
- **Next 16 async params**: Route Handlers with dynamic segments (`[membershipId]`, `[inviteId]`, `[token]`) must read params via the async shape documented in `node_modules/next/dist/docs/01-app/` (research.md §8, Constitution VIII)
- **No client workspaceId**: every Route Handler and Server Action derives `workspaceId` from `session.user.activeWorkspaceId` — never from request body or query string (Constitution I/VIII)
- Commit after each logical group or checkpoint; stop at any checkpoint to validate independently
