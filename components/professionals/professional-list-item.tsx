"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { WorkspaceRole } from "@/generated/prisma/client";
import type { MemberDTO } from "@/lib/workspace/member-service";
import { useUpdateMember } from "@/hooks/professionals/use-members";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/workspace/labels";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MemberRoleSelect } from "@/components/professionals/member-role-select";
import { MemberStatusToggle } from "@/components/professionals/member-status-toggle";
import { ProfessionalAvatar } from "@/components/professionals/professional-avatar";
import { ProfessionalPhotoUploader } from "@/components/professionals/professional-photo-uploader";

function JobTitleField({ member }: { member: MemberDTO }) {
  const updateMember = useUpdateMember();
  const [value, setValue] = useState(member.jobTitle ?? "");

  async function commit() {
    const next = value.trim();
    if (next === (member.jobTitle ?? "")) return;

    try {
      await updateMember.mutateAsync({
        membershipId: member.membershipId,
        data: { jobTitle: next === "" ? null : next },
      });
      toast.success("Cargo atualizado.");
    } catch (error) {
      setValue(member.jobTitle ?? "");
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar."
      );
    }
  }

  return (
    <Input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      placeholder="Cargo"
      aria-label="Cargo do profissional"
      className="h-8 max-w-[200px]"
    />
  );
}

export function ProfessionalListItem({
  member,
  callerRole,
}: {
  member: MemberDTO;
  callerRole: WorkspaceRole;
}) {
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
      <div className="flex items-center gap-3">
        {canManage ? (
          <ProfessionalPhotoUploader member={member} />
        ) : (
          <ProfessionalAvatar
            firstName={member.firstName}
            lastName={member.lastName}
            image={member.image}
          />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-display font-semibold text-foreground">
            {member.firstName} {member.lastName}
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {member.email}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canManage ? (
          <>
            <JobTitleField member={member} />
            <MemberRoleSelect member={member} callerRole={callerRole} />
            <MemberStatusToggle member={member} callerRole={callerRole} />
          </>
        ) : (
          <>
            {member.jobTitle && (
              <span className="text-sm text-muted-foreground">
                {member.jobTitle}
              </span>
            )}
            <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
            <Badge
              className={
                member.status === "ACTIVE"
                  ? "border-success-fg/20 bg-success-bg text-success-fg"
                  : "border-border bg-muted text-muted-foreground"
              }
            >
              {STATUS_LABELS[member.status]}
            </Badge>
          </>
        )}
      </div>
    </div>
  );
}
