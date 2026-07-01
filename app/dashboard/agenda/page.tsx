import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AgendaView } from "@/components/agenda/agenda-view";
import { prisma } from "@/lib/prisma";
import { listAppointments } from "@/lib/workspace/appointment-service";
import { listMembers } from "@/lib/workspace/member-service";
import { startOfToday, toDateKey } from "@/lib/agenda/time-grid";

export default async function AgendaPage() {
  const session = await auth();
  const workspaceId = session?.user.activeWorkspaceId;

  if (!session || !workspaceId) {
    redirect("/login");
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId },
    },
    select: { id: true, role: true, status: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    redirect("/selecionar-workspace");
  }

  const initialDate = toDateKey(startOfToday());
  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  const [initialAppointments, initialMembers] = await Promise.all([
    listAppointments({
      workspaceId,
      callerMembershipId: membership.id,
      callerRole: membership.role,
      date: initialDate,
      includeCancelled: false,
    }),
    canManage ? listMembers(workspaceId) : Promise.resolve(undefined),
  ]);

  return (
    <main className="flex flex-1 flex-col p-4 md:p-8">
      <AgendaView
        callerRole={membership.role}
        callerMembershipId={membership.id}
        initialAppointments={initialAppointments}
        initialDate={initialDate}
        initialMembers={initialMembers}
      />
    </main>
  );
}
