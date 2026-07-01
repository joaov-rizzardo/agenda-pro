"use client";

import type { WorkspaceRole } from "@/generated/prisma/client";
import type { InviteDTO } from "@/lib/workspace/invite-service";
import type { MemberDTO } from "@/lib/workspace/member-service";
import { useInvites } from "@/hooks/professionals/use-invites";
import { useMembers } from "@/hooks/professionals/use-members";
import { InviteProfessionalDialog } from "@/components/professionals/invite-professional-dialog";
import { PendingInvitesList } from "@/components/professionals/pending-invites-list";
import { ProfessionalListItem } from "@/components/professionals/professional-list-item";

export function ProfessionalsView({
  callerRole,
  initialMembers,
  initialInvites,
}: {
  callerRole: WorkspaceRole;
  initialMembers: MemberDTO[];
  initialInvites: InviteDTO[];
}) {
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";
  const { data: members = [] } = useMembers(initialMembers);
  const { data: invites = [] } = useInvites(
    canManage ? initialInvites : undefined
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Equipe
          </span>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Profissionais
          </h1>
        </div>
        {canManage && <InviteProfessionalDialog callerRole={callerRole} />}
      </header>

      {canManage && <PendingInvitesList invites={invites} />}

      <section className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Profissionais ativos
        </span>
        {members.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            Nenhum profissional ainda. Convide o primeiro membro da sua equipe.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <ProfessionalListItem
                key={member.membershipId}
                member={member}
                callerRole={callerRole}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
