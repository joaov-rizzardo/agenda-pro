import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { BusinessHoursSection } from "@/components/settings/business-hours-section";
import { prisma } from "@/lib/prisma";
import { getBusinessHours } from "@/lib/workspace/business-hours-service";

export default async function ConfiguracoesPage() {
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

  const businessHours = await getBusinessHours(workspaceId);

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Ajustes do workspace.
        </p>
      </header>

      <div className="max-w-2xl">
        <BusinessHoursSection
          callerRole={membership.role}
          initialBusinessHours={businessHours}
        />
      </div>
    </main>
  );
}
