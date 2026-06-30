"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle2, MailX } from "lucide-react";

import type { WorkspaceRole } from "@/generated/prisma/client";
import { acceptInvite } from "@/app/actions/invite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
};

type InvalidKind = "invalid" | "expired" | "cancelled" | "accepted";

export type AcceptInviteState =
  | {
      kind: "valid";
      token: string;
      workspaceName: string;
      role: WorkspaceRole;
      jobTitle: string | null;
    }
  | { kind: InvalidKind }
  | { kind: "wrong-account"; email: string };

const INVALID_COPY: Record<
  InvalidKind,
  { title: string; description: string }
> = {
  invalid: {
    title: "Convite inválido",
    description:
      "Não encontramos este convite. Verifique o link ou peça um novo convite.",
  },
  expired: {
    title: "Convite expirado",
    description:
      "Este convite não é mais válido. Peça para reenviarem o convite e tente novamente.",
  },
  cancelled: {
    title: "Convite cancelado",
    description: "Este convite foi cancelado e não pode mais ser aceito.",
  },
  accepted: {
    title: "Convite já aceito",
    description: "Este convite já foi aceito. Entre para acessar o workspace.",
  },
};

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-lg ring-1 ring-border">
      <div className="h-1.5 w-full bg-[image:var(--gradient-primary)]" />
      <Card className="rounded-none border-0 ring-0">{children}</Card>
    </div>
  );
}

function AcceptButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Entrando…" : "Aceitar convite"}
    </Button>
  );
}

export function AcceptInviteCard({ state }: { state: AcceptInviteState }) {
  if (state.kind === "valid") {
    const acceptAction = acceptInvite.bind(null, state.token);
    return (
      <CardShell>
        <CardHeader className="px-8 pt-8">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Convite
          </span>
          <CardTitle className="font-display text-2xl">
            Você foi convidado
          </CardTitle>
          <CardDescription>
            Você foi convidado para participar do workspace{" "}
            <strong className="text-foreground">{state.workspaceName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-8 pb-8">
          <dl className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Nível de acesso</dt>
              <dd className="font-medium text-foreground">
                {ROLE_LABELS[state.role]}
              </dd>
            </div>
            {state.jobTitle && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Cargo</dt>
                <dd className="font-medium text-foreground">
                  {state.jobTitle}
                </dd>
              </div>
            )}
          </dl>
          <form action={acceptAction}>
            <AcceptButton />
          </form>
        </CardContent>
      </CardShell>
    );
  }

  if (state.kind === "wrong-account") {
    return (
      <CardShell>
        <CardHeader className="px-8 pt-8">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Convite
          </span>
          <CardTitle className="font-display text-2xl">Conta diferente</CardTitle>
          <CardDescription>
            Este convite foi enviado para{" "}
            <strong className="text-foreground">{state.email}</strong>. Entre com
            essa conta para aceitar o convite.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Button asChild variant="outline" className="w-full">
            <a href="/login">Entrar com outra conta</a>
          </Button>
        </CardContent>
      </CardShell>
    );
  }

  const copy = INVALID_COPY[state.kind];
  return (
    <CardShell>
      <CardHeader className="px-8 pt-8">
        <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-warn-bg">
          {state.kind === "accepted" ? (
            <CheckCircle2 className="size-6 text-success-fg" />
          ) : (
            <MailX className="size-6 text-warn-fg" />
          )}
        </div>
        <CardTitle className="font-display text-2xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <Button asChild variant="outline" className="w-full">
          <a href="/login">Voltar para o login</a>
        </Button>
      </CardContent>
    </CardShell>
  );
}
