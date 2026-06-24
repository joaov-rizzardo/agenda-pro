import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { GradientText } from "@/components/ui/gradient-text";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { resolveWorkspaceRoute } from "@/lib/workspace/workspace-service";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const decision = await resolveWorkspaceRoute(
    session.user.id,
    session.user.activeWorkspaceId
  );

  if (decision.type === "onboarding") {
    redirect("/onboarding");
  }

  if (decision.type === "select-workspace") {
    redirect("/selecionar-workspace");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-12 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger />
          <span className="font-display text-base font-semibold text-foreground">
            Agenda <GradientText>Pro</GradientText>
          </span>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
