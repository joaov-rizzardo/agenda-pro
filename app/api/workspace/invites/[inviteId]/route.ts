import { NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import { cancelInvite, resendInvite } from "@/lib/workspace/invite-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    const caller = await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    const invite = await resendInvite({
      workspaceId,
      inviteId,
      invitedById: userId,
      callerRole: caller.role,
    });

    return NextResponse.json({ invite });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    await requireWorkspaceRole(userId, workspaceId, ["OWNER", "ADMIN"]);

    await cancelInvite(workspaceId, inviteId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
