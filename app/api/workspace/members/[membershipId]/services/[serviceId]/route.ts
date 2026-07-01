import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import {
  setCustomPrice,
  unassociateService,
} from "@/lib/workspace/professional-service-service";
import { SetCustomPriceSchema } from "@/lib/validation/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string; serviceId: string }> }
) {
  try {
    const { membershipId, serviceId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    await requireWorkspaceRole(userId, workspaceId, ["OWNER", "ADMIN"]);

    const body: unknown = await request.json();
    const parsed = SetCustomPriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const service = await setCustomPrice({
      workspaceId,
      membershipId,
      serviceId,
      data: parsed.data,
    });

    return NextResponse.json({ service });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ membershipId: string; serviceId: string }> }
) {
  try {
    const { membershipId, serviceId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    await requireWorkspaceRole(userId, workspaceId, ["OWNER", "ADMIN"]);

    await unassociateService({ workspaceId, membershipId, serviceId });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
