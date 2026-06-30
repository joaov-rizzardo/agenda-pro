import type {
  WorkspaceMembership,
  WorkspaceRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Typed error thrown by workspace authorization / business rules. Route Handlers
 * and Server Actions catch it and translate `status` + pt-BR `message` into a
 * consistent JSON error response (Constitution III/V).
 */
export class WorkspaceAuthError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "WorkspaceAuthError";
    this.status = status;
  }
}

/**
 * Ensures the caller has an ACTIVE membership in the workspace and that its role
 * is one of `allowedRoles`. Returns the caller's membership or throws a
 * `WorkspaceAuthError` (401/403). Tenant context (`workspaceId`) must already be
 * derived from the session — never from client input (Constitution I/VIII).
 */
export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  allowedRoles: readonly WorkspaceRole[]
): Promise<WorkspaceMembership> {
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new WorkspaceAuthError(
      403,
      "Você não tem acesso a este workspace."
    );
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new WorkspaceAuthError(
      403,
      "Você não tem permissão para realizar esta ação."
    );
  }

  return membership;
}
