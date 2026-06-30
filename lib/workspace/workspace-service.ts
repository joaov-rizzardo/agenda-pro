import type { WorkspaceRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type WorkspaceOption = { id: string; name: string; role: WorkspaceRole };

export type WorkspaceRouteDecision =
  | { type: "onboarding" }
  | { type: "select-workspace"; workspaces: WorkspaceOption[] }
  | { type: "dashboard"; workspaceId: string };

export async function resolveWorkspaceRoute(
  userId: string,
  activeWorkspaceId: string | null | undefined
): Promise<WorkspaceRouteDecision> {
  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      workspace: { select: { id: true, name: true } },
    },
  });

  if (memberships.length === 0) {
    return { type: "onboarding" };
  }

  if (memberships.length === 1) {
    return { type: "dashboard", workspaceId: memberships[0].workspace.id };
  }

  const activeMembership = activeWorkspaceId
    ? memberships.find((m) => m.workspace.id === activeWorkspaceId)
    : undefined;

  if (activeMembership) {
    return { type: "dashboard", workspaceId: activeMembership.workspace.id };
  }

  return {
    type: "select-workspace",
    workspaces: memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role,
    })),
  };
}
