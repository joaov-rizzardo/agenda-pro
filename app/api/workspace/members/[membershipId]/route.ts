import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import { updateMember } from "@/lib/workspace/member-service";
import { UpdateMemberSchema } from "@/lib/validation/professional";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { membershipId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    const caller = await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    const body: unknown = await request.json();
    const parsed = UpdateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const member = await updateMember({
      workspaceId,
      membershipId,
      callerRole: caller.role,
      data: parsed.data,
    });

    return NextResponse.json({ member });
  } catch (error) {
    return errorResponse(error);
  }
}
