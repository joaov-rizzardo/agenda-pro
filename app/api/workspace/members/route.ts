import { NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import { listMembers } from "@/lib/workspace/member-service";

export async function GET() {
  try {
    const { userId, workspaceId } = await resolveTenant();
    // Any ACTIVE member may read the team list.
    await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const members = await listMembers(workspaceId);
    return NextResponse.json({ members });
  } catch (error) {
    return errorResponse(error);
  }
}
