"use client";

import { toast } from "sonner";

import type { WorkspaceRole } from "@/generated/prisma/client";
import type { MemberDTO } from "@/lib/workspace/member-service";
import { useUpdateMember } from "@/hooks/professionals/use-members";
import { STATUS_LABELS } from "@/lib/workspace/labels";
import { Switch } from "@/components/ui/switch";

export function MemberStatusToggle({
  member,
  callerRole,
}: {
  member: MemberDTO;
  callerRole: WorkspaceRole;
}) {
  const updateMember = useUpdateMember();

  // An ADMIN cannot change an OWNER's status (FR-014).
  const locked = member.role === "OWNER" && callerRole !== "OWNER";
  const isActive = member.status === "ACTIVE";

  async function handleChange(checked: boolean) {
    try {
      await updateMember.mutateAsync({
        membershipId: member.membershipId,
        data: { status: checked ? "ACTIVE" : "INACTIVE" },
      });
      toast.success("Status atualizado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar."
      );
    }
  }

  return (
    <label className="flex items-center gap-2">
      <Switch
        checked={isActive}
        onCheckedChange={handleChange}
        disabled={locked || updateMember.isPending}
        aria-label={`Status do profissional: ${STATUS_LABELS[member.status]}`}
      />
      <span className="text-sm text-muted-foreground">
        {STATUS_LABELS[member.status]}
      </span>
    </label>
  );
}
