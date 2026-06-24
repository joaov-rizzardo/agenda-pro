# Server Action Contract: Logout

This feature adds one new server entry point — no Route Handler, no external
API. It is a Server Action, documented here in place of an HTTP contract.

## `logOut` — `app/actions/auth.ts`

```ts
export async function logOut(): Promise<void>
```

- **Input**: none (no form fields are read).
- **Behavior**:
  1. Calls the existing `signOut` export from `auth.ts` with
     `{ redirectTo: "/login" }`.
  2. NextAuth clears the session (JWT cookie) and performs the redirect.
- **Caller**: a `<form action={logOut}>` wrapping a submit button in the
  sidebar footer (`components/dashboard/logout-button.tsx`), rendered on both
  the desktop persistent sidebar and the mobile drawer (same `AppSidebar`
  tree — FR-005).
- **Authorization**: implicit — only reachable from within `/dashboard/**`,
  which is already gated by `auth()` in `app/dashboard/layout.tsx`. No
  additional check is needed inside `logOut` itself.
- **Errors**: none expected under normal operation; NextAuth's `signOut`
  does not require try/catch here since there is no user input to fail
  validation on (unlike `logIn`/`signUp`, which validate form fields).
- **Post-condition** (FR-006): subsequent direct navigation to any
  `/dashboard` route redirects to `/login`, enforced by the existing
  `auth()` check — unchanged by this feature.
