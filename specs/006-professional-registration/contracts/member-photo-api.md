# Contract: Member Photo Upload API

## `POST /api/workspace/members/[membershipId]/photo`

Upload/replace the profile photo of the user behind `membershipId` (FR-015/FR-016, US3 — P3).
The photo is **global** to the user (`User.image`), but upload is authorized in the workspace
context.

- **Content-Type**: `multipart/form-data` with a single `file` field.
- **Auth**: session required (`401` if absent). `membershipId` is re-scoped to the active
  workspace. Allowed callers: the member **themselves** (own membership) OR an **OWNER/ADMIN** of
  the active workspace. Otherwise `403`.
- **Server validation** (before upload): `file` present and is a `File`; MIME ∈
  `{image/jpeg, image/png}`; size ≤ 5 MB. Invalid → `422` + pt-BR message (US3-S3). No `any`.
- **Behavior**: upload to Supabase Storage `avatars/<userId>.<ext>` (`upsert: true`) via the
  server-only client (`lib/supabase/storage.ts`, service-role key from server env), then update
  `User.image` with the returned public URL.
- **200**: `{ "image": "https://.../avatars/<userId>.<ext>" }`.
- **401** unauthenticated; **403** not owner/admin and not self; **404** membership not in active
  workspace; **422** invalid file; **500** storage failure (typed error, logged — never a generic
  200).

## Notes

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are **server-only** env vars (never
  `NEXT_PUBLIC_*`) — Constitution V. Add them to `.env.example`.
- Multipart `FormData` parsing in a Route Handler must follow the installed Next 16 docs
  (`node_modules/next/dist/docs/01-app/`) — verify before coding.
- Missing photo → no upload; UI shows initials fallback (`AvatarFallback`), FR-017.
- Client mutation invalidates `["members"]` so the new avatar appears without reload.
