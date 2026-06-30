import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { WorkspaceAuthError } from "@/lib/workspace/authorization";

export type TenantContext = {
  userId: string;
  workspaceId: string;
};

/**
 * Resolves the NextAuth session and the active workspace server-side. The
 * tenant id is read from `session.user.activeWorkspaceId` — never from request
 * input (Constitution I/VIII). Throws a `WorkspaceAuthError` (401) when absent.
 */
export async function resolveTenant(): Promise<TenantContext> {
  const session = await auth();

  if (!session) {
    throw new WorkspaceAuthError(401, "Sessão expirada. Entre novamente.");
  }

  const workspaceId = session.user.activeWorkspaceId;
  if (!workspaceId) {
    throw new WorkspaceAuthError(403, "Nenhum workspace ativo selecionado.");
  }

  return { userId: session.user.id, workspaceId };
}

/**
 * Maps a thrown error to a typed JSON error response with a pt-BR message.
 * `WorkspaceAuthError` carries its own status; anything else is a 500
 * (logged, never a generic 200) — Constitution III.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof WorkspaceAuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }

  console.error("[workspace-api] unexpected error", error);
  return NextResponse.json(
    { error: "Algo deu errado. Tente novamente em alguns instantes." },
    { status: 500 }
  );
}
