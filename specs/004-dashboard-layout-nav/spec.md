# Feature Specification: Dashboard Sidebar Navigation Layout

**Feature Branch**: `[004-dashboard-layout-nav]`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Quero desenvolver o layout da minha área logada /dashboard. Ela deve possuir um menu lateral com os seguintes itens que iremos implementar no futuro: Painel ( página principal ), Agenda, Profissionais, Serviços, Configurações. Também deve disponibilizar uma forma de deslogar da plataforma. Cada item deve possuir um icone que corresponda ao que ele significa. O menu deve ser totalmente responsivo em qualquer resolução mobile e desktop."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate the dashboard via the sidebar (Priority: P1)

A logged-in business owner lands on their dashboard and uses a sidebar menu
to move between the main areas of the product: Painel (home), Agenda,
Profissionais, Serviços, and Configurações.

**Why this priority**: The sidebar is the primary wayfinding mechanism for
the entire authenticated area. Without it, none of the future feature areas
(Agenda, Profissionais, Serviços, Configurações) are reachable, so this is
the foundation every other dashboard feature depends on.

**Independent Test**: Can be fully tested by logging in, confirming all five
menu items are visible with a label and a matching icon, and clicking each
one to confirm the page navigates to the corresponding route and the sidebar
highlights the active item.

**Acceptance Scenarios**:

1. **Given** an authenticated user on `/dashboard`, **When** the page loads,
   **Then** the sidebar shows five items — Painel, Agenda, Profissionais,
   Serviços, Configurações — each with a label and a distinct icon
   representing its meaning.
2. **Given** an authenticated user viewing the sidebar, **When** they click a
   menu item other than the one currently active, **Then** the app navigates
   to that item's page and the sidebar visually marks the new item as active.
3. **Given** an authenticated user on the Painel page, **When** the sidebar
   is rendered, **Then** Painel is shown as the active item by default.

---

### User Story 2 - Use the menu on a mobile device (Priority: P2)

A business owner accessing the dashboard from a phone needs the same five
navigation items and the logout action, presented in a way that fits a small
screen without breaking layout or requiring horizontal scrolling.

**Why this priority**: A large share of business owners will check their
dashboard from a phone between appointments. If the menu doesn't work on
mobile, the dashboard is effectively unusable for them, even though the
desktop experience works.

**Independent Test**: Can be fully tested by loading the dashboard at mobile
viewport widths, confirming the sidebar is hidden behind an accessible toggle
control, opening it, navigating to an item, and confirming the menu closes
after navigation.

**Acceptance Scenarios**:

1. **Given** an authenticated user on a mobile-sized viewport, **When** the
   dashboard loads, **Then** the full sidebar is not permanently visible and
   a toggle control (e.g., a menu button) is shown instead.
2. **Given** the mobile toggle control, **When** the user activates it,
   **Then** the navigation menu opens, displaying all five items, the logout
   action, and remains fully usable without horizontal scrolling at any
   supported mobile width.
3. **Given** the mobile navigation menu is open, **When** the user selects a
   menu item, **Then** the app navigates to that page and the menu closes
   automatically.

---

### User Story 3 - Log out from the dashboard (Priority: P3)

A logged-in business owner wants to end their session and leaves the
dashboard from any page, on any device, in a single, clearly labeled action
within the navigation menu.

**Why this priority**: Logout is a baseline expectation of any authenticated
area and a security-relevant action, but it is a single, simple action
layered on top of the navigation shell delivered in User Story 1, so it is
lower priority than making the core navigation work.

**Independent Test**: Can be fully tested by clicking the logout action from
the sidebar (desktop) or the open mobile menu, and confirming the session
ends and the user is returned to a non-authenticated page.

**Acceptance Scenarios**:

1. **Given** an authenticated user on any dashboard page, **When** they
   activate the logout action in the navigation menu, **Then** their session
   ends and they are redirected to the login page.
2. **Given** a logged-out session, **When** the user attempts to revisit a
   `/dashboard` URL directly, **Then** they are redirected to the login page
   instead of seeing dashboard content.

### Edge Cases

- What happens when the viewport is resized between mobile and desktop while
  the mobile menu is open? The menu MUST re-evaluate its presentation (closed
  drawer vs. persistent sidebar) without leaving the user in a broken or
  inaccessible state.
- What happens when a user clicks a navigation item for an area whose page
  content isn't built yet (Agenda, Profissionais, Serviços, Configurações)?
  The route MUST still resolve to a valid page (a clearly labeled placeholder)
  rather than a broken link or error page.
- What happens when the user's session expires while they are on a
  dashboard page? The next navigation action or page load MUST redirect them
  to the login page rather than showing a half-authenticated state.
- How does the menu behave at very narrow mobile widths (e.g., small phones)
  or with longer label translations? All five labels and icons MUST remain
  legible and tappable without overlapping or being clipped.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The authenticated dashboard area MUST present a navigation
  menu containing exactly five items, in this order: Painel, Agenda,
  Profissionais, Serviços, Configurações.
- **FR-002**: Each navigation item MUST display an icon that visually
  represents its meaning, alongside its text label.
- **FR-003**: The navigation menu MUST visually indicate which item
  corresponds to the page currently being viewed.
- **FR-004**: Selecting "Painel" MUST navigate to the dashboard's main/home
  page; selecting any other item MUST navigate to that item's dedicated
  route.
- **FR-005**: The navigation menu MUST include a logout action, separate
  from the five content navigation items, that ends the user's authenticated
  session.
- **FR-006**: Logging out MUST redirect the user to the login page and MUST
  prevent further access to dashboard pages until they authenticate again.
- **FR-007**: On desktop-sized viewports, the navigation menu MUST be
  presented as a persistently visible sidebar.
- **FR-008**: On mobile-sized viewports, the navigation menu MUST be
  presented behind an explicit toggle control and MUST not require
  horizontal scrolling to access any item.
- **FR-009**: The navigation menu's presentation MUST adapt correctly across
  the full range of supported mobile and desktop viewport widths, without
  overlapping content or clipped labels/icons.
- **FR-010**: Routes for Agenda, Profissionais, Serviços, and Configurações
  MUST resolve to a valid page, even before their full functionality is
  implemented in future work.
- **FR-011**: Direct navigation to any `/dashboard` route by an
  unauthenticated visitor MUST redirect to the login page instead of
  rendering dashboard content.
- **FR-012**: All navigation menu labels and any user-visible placeholder
  page content MUST be written in Brazilian Portuguese.

### Key Entities

- **Navigation Item**: Represents one entry in the dashboard's menu — a
  label (Painel, Agenda, Profissionais, Serviços, or Configurações), an
  icon, a destination route, and whether it is the currently active item.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any dashboard page, a user can reach any of the other
  four sections in a single click or tap.
- **SC-002**: 100% of the five navigation items display both a label and a
  matching icon, and the currently active item is visually distinguishable
  from the rest.
- **SC-003**: On mobile viewports, a user can open the navigation menu,
  select any item, and reach that page without any horizontal scrolling or
  visually broken layout, at any supported screen width.
- **SC-004**: A user can end their session from any dashboard page in a
  single action and is unable to view dashboard content afterward without
  logging in again.
- **SC-005**: The navigation experience (item order, labels, icons, active
  state, logout placement) is consistent whether accessed on a mobile or
  desktop viewport.

## Assumptions

- Only the navigation shell (sidebar/drawer, icons, active state, logout) is
  in scope for this feature. The actual feature pages for Agenda,
  Profissionais, Serviços, and Configurações are out of scope and will be
  implemented in future, separate work; for this feature they only need a
  minimal placeholder page so their routes resolve correctly.
- The "Painel" item is the dashboard's main/home page and is also out of
  scope for its eventual content — only its route and place in the
  navigation are covered here, consistent with the other items.
- Page protection for `/dashboard` routes relies on the authentication
  system already implemented for sign-up/login (see the user-authentication
  feature); this feature only adds the navigation layout on top of that
  existing protection.
- On desktop, the sidebar is always fully expanded (labels and icons both
  visible); a collapsible icon-only desktop mode is not required for this
  feature.
- No confirmation dialog is required before logging out; activating the
  logout action ends the session immediately.
