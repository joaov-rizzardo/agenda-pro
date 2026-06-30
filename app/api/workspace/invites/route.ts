import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import { createInvite, listInvites } from "@/lib/workspace/invite-service";
import { CreateInviteSchema } from "@/lib/validation/professional";

export async function GET() {
  try {
    const { userId, workspaceId } = await resolveTenant();
    await requireWorkspaceRole(userId, workspaceId, ["OWNER", "ADMIN"]);

    const invites = await listInvites(workspaceId);
    return NextResponse.json({ invites });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, workspaceId } = await resolveTenant();
    const caller = await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    const body: unknown = await request.json();
    const parsed = CreateInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const { email, name, role, jobTitle } = parsed.data;

    // Only an OWNER may invite someone as ADMIN or OWNER (FR-009).
    if ((role === "OWNER" || role === "ADMIN") && caller.role !== "OWNER") {
      return NextResponse.json(
        {
          error:
            "Apenas o proprietário pode convidar administradores ou proprietários.",
        },
        { status: 403 }
      );
    }

    const invite = await createInvite({
      workspaceId,
      invitedById: userId,
      email,
      name,
      role,
      jobTitle,
    });

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
