"use client";

import { toast } from "sonner";

import type { InviteDTO } from "@/lib/workspace/invite-service";
import {
  useCancelInvite,
  useResendInvite,
} from "@/hooks/professionals/use-invites";
import { ROLE_LABELS } from "@/lib/workspace/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function StatusBadge({ status }: { status: InviteDTO["status"] }) {
  if (status === "EXPIRED") {
    return <Badge variant="outline">Expirado</Badge>;
  }
  return (
    <Badge className="border-warn-fg/20 bg-warn-bg text-warn-fg">
      Pendente
    </Badge>
  );
}

function InviteActions({ invite }: { invite: InviteDTO }) {
  const resend = useResendInvite();
  const cancel = useCancelInvite();

  async function handleResend() {
    try {
      await resend.mutateAsync(invite.id);
      toast.success("Convite reenviado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível reenviar."
      );
    }
  }

  async function handleCancel() {
    try {
      await cancel.mutateAsync(invite.id);
      toast.success("Convite cancelado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível cancelar."
      );
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={resend.isPending}
      >
        Reenviar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        onClick={handleCancel}
        disabled={cancel.isPending}
      >
        Cancelar
      </Button>
    </div>
  );
}

export function PendingInvitesList({ invites }: { invites: InviteDTO[] }) {
  if (invites.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Convites pendentes
      </span>

      <div className="flex flex-col gap-2">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border md:flex-row md:items-center md:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  {invite.email}
                </span>
                <Badge variant="outline">{ROLE_LABELS[invite.role]}</Badge>
                <StatusBadge status={invite.status} />
              </div>
              <span className="text-xs text-muted-foreground">
                {invite.jobTitle ? `${invite.jobTitle} · ` : ""}
                Expira em{" "}
                <span className="font-mono">
                  {DATE_FORMAT.format(new Date(invite.expiresAt))}
                </span>
              </span>
            </div>
            <InviteActions invite={invite} />
          </div>
        ))}
      </div>
    </section>
  );
}
