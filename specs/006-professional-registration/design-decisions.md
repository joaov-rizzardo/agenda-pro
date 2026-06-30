# Design Decisions — Profissionais screen (T011 gate)

Mobile-first, reusing the established Agenda Pro system. No new primitives, no
hardcoded colors. All copy pt-BR. Tokens: `--gradient-primary` (violet→teal),
`bg-card`, `ring-border`, `font-display` (Sora), `font-mono` (Space Mono eyebrow),
semantic `success/warn/danger` badge pairs, `--radius` 1.25rem.

## Shared page shell (`/dashboard/profissionais`)
- Reuse the dashboard `<main className="flex flex-1 flex-col gap-… p-4 md:p-8">`
  pattern (matches sibling pages). Mobile padding `p-4`, `md:p-8`.
- Header row: `font-mono text-xs uppercase tracking-widest text-muted-foreground`
  eyebrow ("Equipe") above `font-display text-2xl` title "Profissionais". Primary
  action **Convidar profissional** button right-aligned on `md:+`, full-width
  below the title on mobile (no horizontal scroll to reach it — Constitution IX).

## 1. Members list — card list (mobile) / table (`md:+`)
- Single component renders both: `<div className="md:hidden">` card stack +
  `<Table className="hidden md:table">`. Never a horizontally-scrolling table on
  mobile.
- **Mobile card**: GlassPanel-free plain `bg-card ring-1 ring-border rounded-2xl
  p-4`. Top line: avatar (size-10) + name (`font-display font-semibold`) + role
  badge. Second line: email (`text-sm text-muted-foreground truncate`). Third:
  cargo (jobTitle) muted. Edit controls (role select, status toggle) stack at the
  bottom of the card, full-width, only shown to OWNER/ADMIN.
- **Table (`md:+`)**: columns Profissional (avatar+name+email), Cargo, Acesso
  (role), Status, (actions). Row height comfortable; avatar size-8.
- Status shown as a semantic badge: ACTIVE → `success` pair ("Ativo"), INACTIVE →
  muted/`warn` ("Inativo").
- Empty state: centered muted message "Nenhum profissional ainda. Convide o
  primeiro membro da sua equipe." + the invite button.

## 2. Invite dialog (`invite-professional-dialog.tsx`)
- shadcn `<Dialog>`; trigger is the page's primary button. On mobile the dialog is
  near-full-width (`max-w-[calc(100vw-2rem)]`), centered.
- Fields stacked, full-width: Nome (opcional), E-mail (required), Cargo (opcional),
  Nível de acesso (`<Select>`: Proprietário/Administrador/Membro). Labels pt-BR.
- Footer: secondary "Cancelar" + primary "Enviar convite" (uses
  `--gradient-primary-cta` styling consistent with primary buttons). Pending state:
  "Enviando…", button disabled.
- Inline field errors `text-xs text-destructive` (mirrors signup-form).

## 3. Member edit controls
- **Role**: shadcn `<Select>` inline. OWNER/ADMIN options disabled when caller is
  not OWNER; whole select disabled when target is an OWNER and caller is ADMIN.
  Server is the real guard; these are UX hints only.
- **Status**: shadcn `<Switch>` with adjacent "Ativo"/"Inativo" label; disabled
  when target is OWNER and caller is ADMIN, or when it is the last active OWNER.
- Mutations fire on change; Sonner toast on success ("Profissional atualizado") /
  error (server pt-BR message). No save button — inline, optimistic feel.

## 4. Photo uploader (`professional-photo-uploader.tsx`)
- Avatar acts as the control: circular avatar with a small camera affordance
  overlay; tapping opens the file picker (`accept="image/jpeg,image/png"`).
- Client pre-validates type + size (≤5 MB) for instant pt-BR feedback before
  upload; server re-validates. States: idle → "Enviando…" (spinner over avatar) →
  success (new image) / error (toast). Touch target ≥ size-10 on mobile.

## 5. Pending invites list (`pending-invites-list.tsx`)
- Its own section below members with eyebrow "Convites pendentes" (only rendered
  when there are PENDING/EXPIRED invites).
- Mobile card / `md:+` row: email + role badge + cargo, status badge
  (PENDING→`warn` "Pendente", EXPIRED→muted "Expirado"), expiry date
  (`font-mono text-xs`). Actions: "Reenviar" (outline) + "Cancelar" (ghost,
  `text-destructive`). Confirm-free; Sonner toast on result.

## 6. Public invite-accept card (`accept-invite-card.tsx`)
- Reuse the auth/selection card chrome exactly: centered `max-w-md`, rounded-3xl
  `bg-card shadow-lg ring-1 ring-border`, the `h-1.5 bg-[image:var(--gradient-primary)]`
  top bar, `font-mono` eyebrow + `font-display text-2xl` title (matches
  `selecionar-workspace`/`signup`).
- States (one card body each, pt-BR):
  - **Válido**: eyebrow "Convite", title "Você foi convidado", body shows workspace
    name, nível de acesso, cargo; primary "Aceitar convite".
  - **Inválido/Expirado/Cancelado/Aceito**: warn/danger icon, clear message, no
    action (a "Voltar para o login" outline link only).
  - **Conta diferente**: notice to entrar com o e-mail convidado.
- No gradient hero beyond the existing thin top bar — keep it quiet, consistent
  with the rest of the unauthenticated surfaces.

## Risk / signature (kept disciplined)
The one expressive moment is the **status semantic badges + inline switch** giving
the team list a live, controllable feel — everything else stays quiet and matches
the existing system. No new palette, no decorative motion.
