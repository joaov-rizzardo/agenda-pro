import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import {
  createService,
  listServices,
} from "@/lib/workspace/service-catalog-service";
import {
  CreateServiceSchema,
  SERVICE_STATUSES,
} from "@/lib/validation/service";

export async function GET(request: NextRequest) {
  try {
    const { userId, workspaceId } = await resolveTenant();
    // Any ACTIVE member may read the catalog.
    await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam &&
      (SERVICE_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as (typeof SERVICE_STATUSES)[number])
        : undefined;

    const services = await listServices(workspaceId, status);
    return NextResponse.json({ services });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, workspaceId } = await resolveTenant();
    await requireWorkspaceRole(userId, workspaceId, ["OWNER", "ADMIN"]);

    const body: unknown = await request.json();
    const parsed = CreateServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const service = await createService({ workspaceId, data: parsed.data });
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
