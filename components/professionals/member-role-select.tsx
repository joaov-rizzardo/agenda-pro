"use client";

import { toast } from "sonner";

import type { WorkspaceRole } from "@/generated/prisma/client";
import type { MemberDTO } from "@/lib/workspace/member-service";
import { useUpdateMember } from "@/hooks/professionals/use-members";
import { ROLE_LABELS } from "@/lib/workspace/labels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MemberRoleSelect({
  member,
  callerRole,
}: {
  member: MemberDTO;
  callerRole: WorkspaceRole;
}) {
  const updateMember = useUpdateMember();

  const callerIsOwner = callerRole === "OWNER";
  // An ADMIN cannot change an OWNER's role (FR-010).
  const locked = member.role === "OWNER" && !callerIsOwner;

  async function handleChange(value: string) {
    const role = value as WorkspaceRole;
    if (role === member.role) return;

    try {
      await updateMember.mutateAsync({
        membershipId: member.membershipId,
        data: { role },
      });
      toast.success("Nível de acesso atualizado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar."
      );
    }
  }

  return (
    <Select
      value={member.role}
      onValueChange={handleChange}
      disabled={locked || updateMember.isPending}
    >
      <SelectTrigger size="sm" className="w-[150px]" aria-label="Nível de acesso">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="MEMBER">{ROLE_LABELS.MEMBER}</SelectItem>
        <SelectItem value="ADMIN" disabled={!callerIsOwner}>
          {ROLE_LABELS.ADMIN}
        </SelectItem>
        <SelectItem value="OWNER" disabled={!callerIsOwner}>
          {ROLE_LABELS.OWNER}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
