import { ChevronRight } from "lucide-react";

import type { WorkspaceOption } from "@/lib/workspace/workspace-service";
import { selectWorkspace } from "@/app/actions/workspace";
import { Badge } from "@/components/ui/badge";
import { GlassPanel } from "@/components/ui/glass-panel";

const ROLE_LABELS: Record<WorkspaceOption["role"], string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
};

export function WorkspaceSelectionItem({
  workspace,
}: {
  workspace: WorkspaceOption;
}) {
  const initial = workspace.name.trim().charAt(0).toUpperCase();

  return (
    <form action={selectWorkspace}>
      <input type="hidden" name="workspaceId" value={workspace.id} />
      <GlassPanel className="overflow-hidden">
        <button
          type="submit"
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-semibold text-secondary-foreground">
            {initial || "?"}
          </span>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate font-display text-sm font-semibold text-foreground">
              {workspace.name}
            </span>
            <Badge variant="outline" className="mt-0.5 w-fit">
              {ROLE_LABELS[workspace.role]}
            </Badge>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </GlassPanel>
    </form>
  );
}
