import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { GradientText } from "@/components/ui/gradient-text";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session) {
    redirect("/login");
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
