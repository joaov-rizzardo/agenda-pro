import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import {
  createAppointment,
  listAppointments,
} from "@/lib/workspace/appointment-service";
import {
  CreateAppointmentSchema,
  ListAppointmentsSchema,
} from "@/lib/validation/appointment";

export async function GET(request: NextRequest) {
  try {
    const { userId, workspaceId } = await resolveTenant();
    const membership = await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const searchParams = request.nextUrl.searchParams;
    const parsed = ListAppointmentsSchema.safeParse({
      professionalId: searchParams.get("professionalId") ?? undefined,
      date: searchParams.get("date") ?? "",
      includeCancelled: searchParams.get("includeCancelled") === "true",
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const result = await listAppointments({
      workspaceId,
      callerMembershipId: membership.id,
      callerRole: membership.role,
      professionalId: parsed.data.professionalId,
      date: parsed.data.date,
      includeCancelled: parsed.data.includeCancelled,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, workspaceId } = await resolveTenant();
    const membership = await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const body: unknown = await request.json();
    const parsed = CreateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const { appointment } = await createAppointment({
      workspaceId,
      callerMembershipId: membership.id,
      callerRole: membership.role,
      actorId: userId,
      data: parsed.data,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
