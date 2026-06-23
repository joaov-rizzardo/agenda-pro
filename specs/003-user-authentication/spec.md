# Feature Specification: User Authentication (Login & Sign Up)

**Feature Branch**: `[003-user-authentication]`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Quero adicionar funcionalidade de login na minha aplicação. O usuário deve pode digitar usuário e senha, ou se autenticar usando a conta google. Também quero adicionar uma opção para o usuário se cadastrar, nesse primeiro momento iremos salvar nome, sobrenome, e-mail."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign up with email and password (Priority: P1)

A prospective business owner who wants to start using Agenda Pro creates an
account by providing their first name, last name, email address, and a
password, so they can access their dashboard.

**Why this priority**: This is the entry point for any brand-new user who
doesn't have or doesn't want to use a Google account for sign-in. Without it,
there is no way to onboard a user who isn't using Google.

**Independent Test**: Can be fully tested by completing the sign-up form with
a valid first name, last name, unique email, and password, then confirming a
new account is created and the user lands on their dashboard already
authenticated.

**Acceptance Scenarios**:

1. **Given** a visitor on the sign-up page who has not registered before,
   **When** they submit a first name, last name, a unique email, and a valid
   password, **Then** a new, unverified account is created, a verification
   email is sent to the address provided, and the visitor is shown a message
   asking them to confirm their email before they can log in.
2. **Given** a user with a freshly created, unverified account, **When** they
   click the verification link in the email, **Then** their account becomes
   verified and they can log in with their email and password.
3. **Given** a user with an unverified account, **When** they attempt to log
   in before clicking the verification link, **Then** the system blocks the
   login and tells them to verify their email first.
4. **Given** a visitor attempts to sign up with an email address that is
   already registered, **When** they submit the form, **Then** the system
   rejects the submission and shows a clear message that the email is
   already in use.
5. **Given** a visitor submits the sign-up form with an invalid email format
   or a password that doesn't meet minimum requirements, **When** they
   submit, **Then** the system shows field-specific validation errors and
   does not create an account.

---

### User Story 2 - Log in with email and password (Priority: P1)

An existing business owner returns to Agenda Pro and enters their registered
email and password to access their dashboard.

**Why this priority**: Returning users need a reliable way back into their
account; without it the product is unusable after the first session ends.

**Independent Test**: Can be tested by registering a test account, logging
out, and logging back in with the same email and password, confirming
dashboard access is restored.

**Acceptance Scenarios**:

1. **Given** a registered user on the login page, **When** they enter their
   correct email and password, **Then** they are authenticated and taken to
   their dashboard.
2. **Given** a registered user enters an incorrect password, **When** they
   submit, **Then** the system shows a generic invalid-credentials message
   and does not authenticate them.
3. **Given** a user enters an email that has no associated account, **When**
   they submit, **Then** the system shows the same generic
   invalid-credentials message, avoiding confirmation of which emails are
   registered.

---

### User Story 3 - Sign up or log in with Google (Priority: P2)

A user who already has a Google account chooses to continue with Google
instead of creating a separate password, automatically signing up (on first
use) or logging in (on return) through their Google identity.

**Why this priority**: Removes the friction of creating and remembering
another password, speeding up onboarding for users who prefer an existing
identity provider. Ranked P2 because email/password is the baseline path and
Google sign-in is an enhancement on top of it.

**Independent Test**: Can be tested by choosing "Continue with Google",
completing Google's consent flow with a test Google account, and confirming
an Agenda Pro account is created or recognized and dashboard access is
granted.

**Acceptance Scenarios**:

1. **Given** a user who has never signed up before, **When** they choose to
   continue with Google and approve access, **Then** a new Agenda Pro
   account is created using their Google profile's name and email, and they
   are signed in.
2. **Given** a user who previously signed up via Google, **When** they
   choose to continue with Google again, **Then** they are recognized and
   logged into their existing account without a duplicate account being
   created.
3. **Given** a user who already has an Agenda Pro account created with
   email/password, **When** they choose to continue with Google using the
   same email address, **Then** the system links the Google sign-in to that
   existing account instead of creating a second, separate account.

---

### Edge Cases

- What happens when a user tries to sign up with email/password using an
  email address that already has a Google-authenticated account (or
  vice-versa)? The system links sign-in methods on the same verified email
  rather than creating duplicate accounts (see User Story 3, Scenario 3).
- What happens when a user abandons the Google consent screen partway
  through? The system returns them to the login/sign-up page with no account
  created and no session started.
- What happens when a user forgets their password? There is no self-service
  password recovery in this iteration (see FR-012); the user must seek
  support through another channel.
- What happens when a user with an unverified email tries to log in? The
  system blocks the login and prompts them to verify their email first (see
  User Story 1, Scenario 3).
- What happens if the verification email is lost or expires? [Not in scope
  for this iteration — resending/expiring verification links is deferred
  along with password recovery.]
- What happens if a user's Google account email is unverified on Google's
  side? The system rejects the sign-in/sign-up attempt and shows a message
  asking the user to verify their email with Google first.
- What happens when a user double-submits the sign-up form (e.g., double
  click)? The system MUST NOT create two accounts for the same submission.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a new user to create an account by providing
  first name, last name, email address, and password.
- **FR-002**: System MUST reject sign-up attempts using an email address
  that is already associated with an existing account.
- **FR-003**: System MUST validate email format and enforce a minimum
  password strength before creating an account.
- **FR-004**: System MUST allow an existing user to log in using their
  registered email address and password.
- **FR-005**: System MUST show a generic invalid-credentials message on
  failed login attempts, without revealing whether the email address is
  registered.
- **FR-006**: System MUST allow users to sign up or log in using their
  Google account as an alternative to email and password.
- **FR-007**: When a user authenticates with Google for the first time, the
  system MUST automatically create an account using the name and email
  provided by Google, without requiring the user to fill in a separate
  sign-up form.
- **FR-008**: System MUST link a Google sign-in to an existing
  email/password account when both share the same verified email address,
  rather than creating a second account.
- **FR-009**: System MUST allow an authenticated user to log out, ending
  their session.
- **FR-010**: System MUST keep a user's session active across page
  navigation until they explicitly log out or their session expires.
- **FR-011**: System MUST send a verification email after email/password
  sign-up and MUST block login on that account until the user confirms their
  email address via the link in that email. Accounts created or linked via
  Google sign-in are considered already verified, since Google has already
  confirmed ownership of that email address.
- **FR-012**: Password recovery ("forgot password") is out of scope for this
  first iteration. Users who lose access to a password-based account must be
  assisted through another channel (e.g., support) until a dedicated
  password-reset feature is built.

### Key Entities *(include if feature involves data)*

- **Account**: Represents a business owner who can log into Agenda Pro.
  Attributes: first name, last name, email address (unique), password
  (present only for accounts using email/password sign-in), linked Google
  identity (present only for accounts that have authenticated with Google),
  creation date. An account may have a password, a linked Google identity,
  or both, but is always identified by a single unique email address.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete account creation and, for
  email/password sign-up, confirm their email and reach their dashboard, in
  under 2 minutes (Google sign-up reaches the dashboard immediately, with no
  separate verification step).
- **SC-002**: A returning user can log into their account in under 30
  seconds.
- **SC-003**: Users who enter invalid credentials receive clear, immediate
  feedback explaining the submission failed, without ambiguity about the
  cause.
- **SC-004**: At least 95% of login and sign-up attempts complete
  successfully without a system error, excluding attempts with invalid
  user-entered data.
- **SC-005**: No two accounts are ever created for the same email address,
  regardless of which sign-in method (password or Google) is used to reach
  it.

## Assumptions

- This authentication feature is for business owners/tenant administrators
  who access the Agenda Pro dashboard. End customers booking appointments
  remain account-less, consistent with the existing public booking flow.
- Profile data beyond first name, last name, and email (e.g., phone number,
  business details) will be collected in a separate, later step or feature,
  not as part of this initial registration.
- Google is the only third-party identity provider in scope for this
  iteration; no other social/SSO providers are included.
- Standard password complexity rules (e.g., minimum length) apply unless a
  stricter policy is specified later.
- Sessions persist using typical web session conventions (until logout or a
  reasonable inactivity timeout), consistent with standard SaaS dashboard
  behavior.
