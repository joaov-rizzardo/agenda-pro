# Quickstart: Validating the Dashboard Sidebar Navigation Layout

## Prerequisites

- Local env configured per `003-user-authentication`'s setup (`.env` with
  `AUTH_SECRET`, `DATABASE_URL`, etc.) and `npx prisma migrate dev` already
  applied.
- At least one verified user account to log in with (sign up + verify email,
  or sign in with Google).
- `npm run dev` running.

## Setup commands (implementation time, not runtime)

```bash
npx shadcn add sidebar   # pulls sheet, separator, tooltip, use-mobile, skeleton
```

## Scenario 1 — Desktop sidebar navigation (User Story 1, P1)

1. Log in and land on `/dashboard`.
2. **Expect**: a persistent left sidebar with five items in order — Painel,
   Agenda, Profissionais, Serviços, Configurações — each with a label and a
   distinct icon. Painel is visually marked active.
3. Click "Agenda". **Expect**: navigates to `/dashboard/agenda`, page renders
   a pt-BR placeholder, and the sidebar now marks "Agenda" active (Painel no
   longer active).
4. Repeat for Profissionais, Serviços, Configurações — each navigates to its
   route and becomes the active item.

## Scenario 2 — Mobile drawer (User Story 2, P2)

1. Resize the browser (or use device emulation) to a mobile width (e.g.
   375px).
2. **Expect**: the persistent sidebar is hidden; a toggle/menu trigger is
   visible instead, no horizontal scrolling.
3. Activate the trigger. **Expect**: the drawer opens showing all five items
   plus the logout control, fully usable without horizontal scroll.
4. Tap "Profissionais". **Expect**: navigates to `/dashboard/profissionais`
   and the drawer closes automatically.
5. With the drawer open, resize back to desktop width. **Expect**: the
   layout cleanly switches to the persistent sidebar with no broken/
   inaccessible intermediate state.

## Scenario 3 — Logout (User Story 3, P3)

1. From any `/dashboard` page (desktop sidebar or open mobile drawer),
   activate the logout control ("Sair").
2. **Expect**: redirected to `/login`.
3. Attempt to navigate directly to `/dashboard` (e.g. via URL bar).
   **Expect**: redirected to `/login`, no dashboard content rendered.

## Edge cases to spot-check

- Resize the viewport while the mobile drawer is open — it must not leave the
  page in a broken/inaccessible state (see Scenario 2 step 5).
- At a very narrow mobile width, confirm all five labels/icons remain legible
  and tappable without overlap or clipping.
- Visit `/dashboard/agenda` (or any placeholder route) directly while logged
  out — must redirect to `/login`, same as `/dashboard` itself.
