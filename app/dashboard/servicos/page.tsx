import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ServicesView } from "@/components/services/services-view";
import { prisma } from "@/lib/prisma";
import { listServices } from "@/lib/workspace/service-catalog-service";

export default async function ServicosPage() {
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

  const services = await listServices(workspaceId);

  return (
    <main className="flex flex-1 flex-col p-4 md:p-8">
      <ServicesView callerRole={membership.role} initialServices={services} />
    </main>
  );
}
