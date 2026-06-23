# Phase 0 Research: User Authentication

## 1. Route protection mechanism on Next.js 16

**Decision**: Use `proxy.ts` at the repository root (default export
`proxy`), not `middleware.ts`.

**Rationale**: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
states plainly: *"the `middleware` file convention is deprecated and has
been renamed to `proxy`"*, with a version-history entry pinning this to
`v16.0.0`: *"Middleware is deprecated and renamed to Proxy. Proxy defaults
to the Node.js runtime."* This project pins `next@16.2.9`, so `middleware.ts`
must not be (re-)introduced — Constitution Principle II explicitly forbids
writing against remembered/training-data Next.js APIs without checking the
installed docs first, and this is exactly such a breaking rename.

A second, equally important consequence of the same doc and of
`node_modules/next/dist/docs/01-app/02-guides/authentication.md`
("Optimistic checks with Proxy"): Proxy runs on **every matched request**
including prefetches, so it must only do a cheap, cookie/JWT-based check —
never a database round-trip. The authoritative check still has to happen
server-side, close to the data (Server Component / Server Action / Route
Handler), which is also exactly Constitution Principle V's requirement that
"client-side checks... are a UX nicety, never the actual access control" —
Proxy here plays the same non-authoritative role.

**Alternatives considered**:
- *No Proxy, rely only on a layout-level check.* Rejected: a logged-out user
  would still pay for a full render pass / data-fetch attempt down the tree
  before being redirected; an optimistic Proxy-level redirect is the
  Next.js-recommended first line of defense and is cheap to add.
- *`middleware.ts` (old convention).* Rejected outright — deprecated in the
  installed Next version, and the user explicitly asked for Next 16 best
  practices.

## 2. Session strategy with mixed Credentials + OAuth providers

**Decision**: `session: { strategy: "jwt" }`, set explicitly in `auth.ts`,
even though a `PrismaAdapter` is configured.

**Rationale**: Inspecting `@auth/core`'s callback handling
(`node_modules/@auth/core/lib/actions/callback/index.js`): when
`provider.type === "credentials"`, the callback path **always** encodes a
JWT session cookie directly — it never calls `adapter.createSession`,
regardless of the configured `session.strategy`. `@auth/core`'s own gate
(`node_modules/@auth/core/lib/utils/assert.js`) only throws
`UnsupportedStrategy` when *every* provider is `credentials` and the
strategy is `"database"`; with a mixed Credentials + Google setup it would
not throw, but the two providers would then produce *inconsistent* session
storage (Google → DB session row, Credentials → JWT cookie only), which
would make a single `auth()`/Proxy check unreliable depending on which
provider the user signed in with. Forcing `"jwt"` globally is the
documented, safe configuration for any Auth.js setup that includes
Credentials. `PrismaAdapter` is still required and still used — for
`getUserByEmail`/`createUser`/`linkAccount` (Credentials look-up and Google
account linking) — just not for session storage.

**Alternatives considered**:
- *Database sessions for Google, JWT for Credentials.* Not actually
  selectable — confirmed by reading the adapter's session-cookie code path,
  Credentials sign-in hard-codes JWT regardless of global config.
- *Drop the Prisma adapter, store everything in the JWT.* Rejected: the
  adapter is still needed to persist `User` rows (first/last name, email,
  password hash) and to look up/link accounts; only *session* storage moves
  to JWT.

## 3. Google account auto-linking on a shared email (FR-007, FR-008)

**Decision**: `Google({ ..., allowDangerousEmailAccountLinking: true })`,
combined with a `signIn` callback that only allows the Google sign-in to
proceed when `profile.email_verified === true`.

**Rationale**: By default, Auth.js refuses to link an OAuth sign-in to an
existing user record that shares the same email but has no prior linked
account for that provider — it throws `OAuthAccountNotLinked`
(`node_modules/@auth/core/src/lib/actions/callback/handle-login.ts`,
confirmed via `grep` for `OAuthAccountNotLinked`/`allowDangerousEmailAccountLinking`).
This is the exact behavior the spec's User Story 3 / FR-008 says must
**not** happen — Google sign-in on an existing email/password account's
email must link, not error. The flag is named "dangerous" because blindly
trusting a third-party-reported email as proof of ownership is unsafe for
providers that don't verify email ownership; Google does (it exposes
`email_verified` on the OAuth profile, documented inline in
`node_modules/@auth/core/providers/google.js`), and the spec's own edge
case ("What happens if a user's Google account email is unverified on
Google's side? ... rejects the sign-in") requires gating on exactly that
flag. So the combination (`allowDangerousEmailAccountLinking: true` +
explicit `email_verified` check in `signIn`) is both required by the spec
and not actually dangerous in this specific case, because the check that
would normally be missing is added back explicitly.

**Alternatives considered**:
- *Leave default linking behavior (no flag).* Rejected — directly
  contradicts FR-008 and User Story 3, Scenario 3 (would throw
  `OAuthAccountNotLinked` instead of linking).
- *Allow linking unconditionally (flag only, no `email_verified` gate).*
  Rejected — would let an attacker who controls an OAuth account with an
  *unverified* matching email (where the provider allows that) take over an
  existing password account. The spec's edge case explicitly calls for
  rejecting this case.

## 4. Password hashing library

**Decision**: `bcryptjs` (pure JavaScript), wrapped in a single
`lib/auth/password.ts` module.

**Rationale**: `bcrypt` (native, via node-gyp) is not installed and adds a
native-build step to every install/deploy for a single hash/compare
operation that runs exclusively inside Server Actions / the Credentials
`authorize()` callback (Node.js runtime — Proxy/edge is never involved,
since hashing only happens in `auth.ts`, not `auth.config.ts`). `bcryptjs`
avoids the native dependency while keeping the same bcrypt algorithm and
API shape, which keeps `node_modules/next/dist/docs/01-app/02-guides/authentication.md`'s
own example pattern (`bcrypt.hash(password, 10)`) directly applicable.

**Alternatives considered**:
- *Native `bcrypt`.* Rejected — unnecessary native build complexity for a
  feature with no documented performance requirement that bcryptjs can't
  meet.
- *Node's built-in `crypto.scrypt`.* Rejected — would require hand-rolling
  salt storage/format and a constant-time compare; `bcryptjs` already
  packages this correctly and is the library implicitly suggested by Next's
  own authentication guide.

## 5. Email verification flow (custom, not Auth.js's Email provider)

**Decision**: Do **not** use Auth.js's built-in `Resend`/`Email` provider
(`node_modules/next-auth/providers/resend.js`). Instead, generate and store
a verification token in the same `VerificationToken` table the
`PrismaAdapter` already requires, send it via the `resend` npm package
directly from a plain server module, and confirm it through a dedicated
Route Handler.

**Rationale**: Auth.js's `Resend`/`Email` provider implements
*passwordless, magic-link login* — the act of clicking the email link **is**
the sign-in. That is a different flow from this spec's requirement: a user
signs up with a password, gets emailed a link, and clicking it only flips a
`User.emailVerified` flag so that *future* password logins are allowed
(FR-011) — the verification click itself does not authenticate them. Reusing
the `VerificationToken` model (`identifier`, `token`, `expires` — already
required by `@auth/prisma-adapter`'s `createVerificationToken`/
`useVerificationToken` methods, confirmed in
`node_modules/@auth/prisma-adapter/src/index.ts`) for this custom purpose
avoids introducing a second, near-identical table.

**Alternatives considered**:
- *Auth.js `Resend` email provider as the verification mechanism.* Rejected
  — conflates "verify your email" with "log me in," which would silently
  authenticate a user from the verification link alone, contradicting
  Acceptance Scenario 2 (clicking the link verifies the account; the user
  still logs in afterward with email + password).
- *A bespoke `EmailVerificationToken` table instead of reusing
  `VerificationToken`.* Rejected as needless duplication — the adapter
  already mandates an identical shape for its own contract.

## 6. Transactional email delivery

**Decision**: `resend` npm package, server-only client singleton in
`lib/email/resend.ts`, `RESEND_API_KEY` + `EMAIL_FROM` as new server-only
env vars.

**Rationale**: Explicitly requested by the user for this iteration
("Para envio de emails vamos usar o resend inicialmente"). Used directly
(not through Auth.js's `Resend` provider — see §5) purely as an email-sending
client.

**Alternatives considered**: None — provider was specified by the user, not
an open technical choice.

## 7. Generic invalid-credentials messaging (FR-005)

**Decision**: The Credentials provider's `authorize()` returns `null`
(triggering Auth.js's generic `CredentialsSignin` error) for both
"no such user" and "wrong password" and for "user exists but
`emailVerified` is null" — i.e., three different server-side conditions,
one identical client-visible error.

**Rationale**: Directly satisfies FR-005 ("avoiding confirmation of which
emails are registered") and User Story 2's two negative scenarios, which
both specify the *same* generic message. Auth.js's `CredentialsSignin`
error type is already designed for this — it carries no detail by default.

**Alternatives considered**: Distinct error messages per condition.
Rejected — explicitly forbidden by FR-005.
