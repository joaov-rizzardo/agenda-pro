import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkspaceSelectionList } from "@/components/workspace/workspace-selection-list";
import { resolveWorkspaceRoute } from "@/lib/workspace/workspace-service";

export default async function SelecionarWorkspacePage() {
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

  if (decision.type === "dashboard") {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden p-6 py-12">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-48 bg-[image:var(--gradient-primary)]"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-lg ring-1 ring-border">
        <div className="h-1.5 w-full bg-[image:var(--gradient-primary)]" />
        <Card className="rounded-none border-0 ring-0">
          <CardHeader className="px-8 pt-8">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Múltiplos workspaces
            </span>
            <CardTitle className="font-display text-2xl">
              Onde você quer entrar?
            </CardTitle>
            <CardDescription>
              Você faz parte de mais de um workspace. Escolha um para
              continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <WorkspaceSelectionList workspaces={decision.workspaces} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
