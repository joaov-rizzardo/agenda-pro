"use client";

import type { MemberDTO } from "@/lib/workspace/member-service";
import { useMembers } from "@/hooks/professionals/use-members";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * OWNER/ADMIN-only switcher for whose agenda is shown. The server still enforces
 * the target-vs-self rule per request (FR-007/FR-025) — this only drives the
 * client's `professionalId`.
 */
export function AgendaProfessionalSelect({
  value,
  onChange,
  initialMembers,
}: {
  value: string;
  onChange: (membershipId: string) => void;
  initialMembers?: MemberDTO[];
}) {
  const { data: members = [] } = useMembers(initialMembers);
  const activeMembers = members.filter((member) => member.status === "ACTIVE");

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-64" aria-label="Profissional">
        <SelectValue placeholder="Selecione um profissional" />
      </SelectTrigger>
      <SelectContent>
        {activeMembers.map((member) => (
          <SelectItem key={member.membershipId} value={member.membershipId}>
            {member.firstName} {member.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
