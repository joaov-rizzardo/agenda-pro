import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import {
  associateService,
  listAssociatedServices,
} from "@/lib/workspace/professional-service-service";
import { AssociateServiceSchema } from "@/lib/validation/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { membershipId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    // Any ACTIVE member may read a professional's services.
    await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const services = await listAssociatedServices({ workspaceId, membershipId });
    return NextResponse.json({ services });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { membershipId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    await requireWorkspaceRole(userId, workspaceId, ["OWNER", "ADMIN"]);

    const body: unknown = await request.json();
    const parsed = AssociateServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const service = await associateService({
      workspaceId,
      membershipId,
      serviceId: parsed.data.serviceId,
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
