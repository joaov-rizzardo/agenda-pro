import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProfessionalsView } from "@/components/professionals/professionals-view";
import { prisma } from "@/lib/prisma";
import type { InviteDTO } from "@/lib/workspace/invite-service";
import { listInvites } from "@/lib/workspace/invite-service";
import { listMembers } from "@/lib/workspace/member-service";

export default async function ProfissionaisPage() {
  const session = await auth();
  const workspaceId = session?.user.activeWorkspaceId;

  if (!session || !workspaceId) {
    redirect("/login");
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId },
    },
    select: { role: true, status: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    redirect("/selecionar-workspace");
  }

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  const [members, invites] = await Promise.all([
    listMembers(workspaceId),
    canManage ? listInvites(workspaceId) : Promise.resolve<InviteDTO[]>([]),
  ]);

  return (
    <main className="flex flex-1 flex-col p-4 md:p-8">
      <ProfessionalsView
        callerRole={membership.role}
        initialMembers={members}
        initialInvites={invites}
      />
    </main>
  );
}
