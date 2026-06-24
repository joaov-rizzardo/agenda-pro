import type { WorkspaceOption } from "@/lib/workspace/workspace-service";
import { WorkspaceSelectionItem } from "@/components/workspace/workspace-selection-item";

export function WorkspaceSelectionList({
  workspaces,
}: {
  workspaces: WorkspaceOption[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {workspaces.map((workspace) => (
        <WorkspaceSelectionItem key={workspace.id} workspace={workspace} />
      ))}
    </div>
  );
}
