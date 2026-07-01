import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import {
  cancelAppointment,
  getAppointmentDetail,
  rescheduleAppointment,
  setAppointmentStatus,
} from "@/lib/workspace/appointment-service";
import {
  CancelAppointmentSchema,
  RescheduleAppointmentSchema,
  SetAppointmentStatusSchema,
} from "@/lib/validation/appointment";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    const membership = await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const detail = await getAppointmentDetail({
      workspaceId,
      callerMembershipId: membership.id,
      callerRole: membership.role,
      appointmentId,
    });

    return NextResponse.json(detail);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    const membership = await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const body: unknown = await request.json();
    const hasStatus =
      typeof body === "object" && body !== null && "status" in body;

    // A `status` field is a status change; anything else is a reschedule intent.
    if (hasStatus) {
      const parsed = SetAppointmentStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
          { status: 400 }
        );
      }
      const { appointment } = await setAppointmentStatus({
        workspaceId,
        callerMembershipId: membership.id,
        callerRole: membership.role,
        actorId: userId,
        appointmentId,
        status: parsed.data.status,
      });
      return NextResponse.json({ appointment });
    }

    const parsed = RescheduleAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }
    const { appointment } = await rescheduleAppointment({
      workspaceId,
      callerMembershipId: membership.id,
      callerRole: membership.role,
      actorId: userId,
      appointmentId,
      data: parsed.data,
    });
    return NextResponse.json({ appointment });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    const membership = await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    // The cancel body (an optional reason) may be absent entirely.
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const parsed = CancelAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const { appointment } = await cancelAppointment({
      workspaceId,
      callerMembershipId: membership.id,
      callerRole: membership.role,
      actorId: userId,
      appointmentId,
      reason: parsed.data.reason,
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    return errorResponse(error);
  }
}
