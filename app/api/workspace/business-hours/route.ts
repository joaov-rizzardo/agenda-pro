import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import {
  getBusinessHours,
  upsertBusinessHours,
} from "@/lib/workspace/business-hours-service";
import { UpsertBusinessHoursSchema } from "@/lib/validation/business-hours";

export async function GET() {
  try {
    const { userId, workspaceId } = await resolveTenant();
    // Any ACTIVE member may read the hours (the grid needs them).
    await requireWorkspaceRole(userId, workspaceId, ["OWNER", "ADMIN", "MEMBER"]);

    const businessHours = await getBusinessHours(workspaceId);
    return NextResponse.json({ businessHours });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, workspaceId } = await resolveTenant();
    await requireWorkspaceRole(userId, workspaceId, ["OWNER", "ADMIN"]);

    const body: unknown = await request.json();
    const parsed = UpsertBusinessHoursSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const businessHours = await upsertBusinessHours(workspaceId, parsed.data);
    return NextResponse.json({ businessHours });
  } catch (error) {
    return errorResponse(error);
  }
}
