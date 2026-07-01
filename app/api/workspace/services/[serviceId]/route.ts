import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import { updateService } from "@/lib/workspace/service-catalog-service";
import { UpdateServiceSchema } from "@/lib/validation/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    await requireWorkspaceRole(userId, workspaceId, ["OWNER", "ADMIN"]);

    const body: unknown = await request.json();
    const parsed = UpdateServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    // Tenant-scoped: a serviceId from another workspace returns 404, never leaks.
    const service = await updateService({
      workspaceId,
      serviceId,
      data: parsed.data,
    });

    return NextResponse.json({ service });
  } catch (error) {
    return errorResponse(error);
  }
}
