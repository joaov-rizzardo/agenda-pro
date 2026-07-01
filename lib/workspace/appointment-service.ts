import type {
  AppointmentEventType,
  AppointmentStatus,
  WorkspaceRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { WorkspaceAuthError } from "@/lib/workspace/authorization";
import { getBusinessHours } from "@/lib/workspace/business-hours-service";
import type { BusinessHoursDTO } from "@/lib/workspace/business-hours-service";
import {
  computeEndsAt,
  isPastStart,
  isWithinBusinessHours,
} from "@/lib/agenda/scheduling-rules";
import type {
  CreateAppointmentInput,
  RescheduleAppointmentInput,
} from "@/lib/validation/appointment";

const CONFLICT_MESSAGE = "Este horário conflita com outro agendamento.";
const PAST_MESSAGE = "Não é possível agendar no passado.";
const CLOSED_MESSAGE = "O workspace está fechado nesse horário.";

export type AppointmentDTO = {
  appointmentId: string;
  membershipId: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  cancellationReason: string | null;
};

export type AppointmentEventDTO = {
  type: AppointmentEventType;
  previousStartsAt: string | null;
  newStartsAt: string | null;
  previousMembershipId: string | null;
  newMembershipId: string | null;
  previousStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus | null;
  reason: string | null;
  actorId: string;
  createdAt: string;
};

export type ListAppointmentsResult = {
  professionalId: string;
  date: string;
  businessHours: BusinessHoursDTO;
  isOpen: boolean;
  appointments: AppointmentDTO[];
};

const APPOINTMENT_SELECT = {
  id: true,
  membershipId: true,
  serviceId: true,
  clientName: true,
  clientPhone: true,
  startsAt: true,
  endsAt: true,
  status: true,
  cancellationReason: true,
  service: { select: { name: true } },
} as const;

type AppointmentRow = {
  id: string;
  membershipId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  cancellationReason: string | null;
  service: { name: string };
};

type AppointmentEventRow = {
  type: AppointmentEventType;
  previousStartsAt: Date | null;
  newStartsAt: Date | null;
  previousMembershipId: string | null;
  newMembershipId: string | null;
  previousStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus | null;
  reason: string | null;
  actorId: string;
  createdAt: Date;
};

function toAppointmentDTO(row: AppointmentRow): AppointmentDTO {
  return {
    appointmentId: row.id,
    membershipId: row.membershipId,
    serviceId: row.serviceId,
    serviceName: row.service.name,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    // The booked duration is the stored interval, not the service's current
    // duration (Edge Case #3: a later service change never moves existing rows).
    durationMinutes: Math.round(
      (row.endsAt.getTime() - row.startsAt.getTime()) / 60_000
    ),
    status: row.status,
    cancellationReason: row.cancellationReason,
  };
}

function toAppointmentEventDTO(row: AppointmentEventRow): AppointmentEventDTO {
  return {
    type: row.type,
    previousStartsAt: row.previousStartsAt?.toISOString() ?? null,
    newStartsAt: row.newStartsAt?.toISOString() ?? null,
    previousMembershipId: row.previousMembershipId,
    newMembershipId: row.newMembershipId,
    previousStatus: row.previousStatus,
    newStatus: row.newStatus,
    reason: row.reason,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Target-vs-self rule (research §7): the caller may always act on their own
 * membership; acting on a different professional requires OWNER/ADMIN. Enforced in
 * the service so the guard travels with the data access (FR-005/FR-007/FR-025).
 */
function assertCanActOnProfessional(params: {
  targetMembershipId: string;
  callerMembershipId: string;
  callerRole: WorkspaceRole;
}): void {
  const { targetMembershipId, callerMembershipId, callerRole } = params;
  if (
    targetMembershipId !== callerMembershipId &&
    callerRole !== "OWNER" &&
    callerRole !== "ADMIN"
  ) {
    throw new WorkspaceAuthError(
      403,
      "Você só pode acessar a sua própria agenda."
    );
  }
}

/** Resolves an ACTIVE-or-not membership within the session workspace, else 404. */
async function resolveMembershipInWorkspace(
  membershipId: string,
  workspaceId: string
): Promise<{ id: string; status: string }> {
  const membership = await prisma.workspaceMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, workspaceId: true, status: true },
  });

  if (!membership || membership.workspaceId !== workspaceId) {
    throw new WorkspaceAuthError(404, "Profissional não encontrado.");
  }

  return { id: membership.id, status: membership.status };
}

function dayRange(date: string): { start: Date; end: Date; weekday: number } {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, weekday: start.getUTCDay() };
}

export async function listAppointments(params: {
  workspaceId: string;
  callerMembershipId: string;
  callerRole: WorkspaceRole;
  professionalId?: string;
  date: string;
  includeCancelled: boolean;
}): Promise<ListAppointmentsResult> {
  const {
    workspaceId,
    callerMembershipId,
    callerRole,
    professionalId,
    date,
    includeCancelled,
  } = params;

  const targetMembershipId = professionalId ?? callerMembershipId;
  assertCanActOnProfessional({
    targetMembershipId,
    callerMembershipId,
    callerRole,
  });
  await resolveMembershipInWorkspace(targetMembershipId, workspaceId);

  const { start, end, weekday } = dayRange(date);

  const statuses: AppointmentStatus[] = includeCancelled
    ? ["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]
    : ["SCHEDULED", "COMPLETED", "NO_SHOW"];

  const rows = await prisma.appointment.findMany({
    where: {
      workspaceId,
      membershipId: targetMembershipId,
      startsAt: { gte: start, lt: end },
      status: { in: statuses },
    },
    orderBy: { startsAt: "asc" },
    select: APPOINTMENT_SELECT,
  });

  const businessHours = await getBusinessHours(workspaceId);

  return {
    professionalId: targetMembershipId,
    date,
    businessHours,
    isOpen: businessHours.openWeekdays.includes(weekday),
    appointments: rows.map(toAppointmentDTO),
  };
}

export async function getAppointmentDetail(params: {
  workspaceId: string;
  callerMembershipId: string;
  callerRole: WorkspaceRole;
  appointmentId: string;
}): Promise<{ appointment: AppointmentDTO; events: AppointmentEventDTO[] }> {
  const { workspaceId, callerMembershipId, callerRole, appointmentId } = params;

  const row = await prisma.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
    select: {
      ...APPOINTMENT_SELECT,
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          type: true,
          previousStartsAt: true,
          newStartsAt: true,
          previousMembershipId: true,
          newMembershipId: true,
          previousStatus: true,
          newStatus: true,
          reason: true,
          actorId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!row) {
    throw new WorkspaceAuthError(404, "Agendamento não encontrado.");
  }

  assertCanActOnProfessional({
    targetMembershipId: row.membershipId,
    callerMembershipId,
    callerRole,
  });

  const { events, ...appointmentRow } = row;
  return {
    appointment: toAppointmentDTO(appointmentRow),
    events: events.map(toAppointmentEventDTO),
  };
}

/**
 * True when a write hit the database-level overlap guarantee (`appointment_no_overlap`
 * EXCLUDE constraint, Postgres error 23P01 — research §3). Prisma surfaces raw
 * constraint violations without a dedicated P-code, so we detect by code/message.
 */
function isOverlapViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as {
    code?: string;
    message?: string;
    meta?: { code?: string };
  };
  if (candidate.code === "23P01" || candidate.meta?.code === "23P01") {
    return true;
  }
  return (
    typeof candidate.message === "string" &&
    (candidate.message.includes("appointment_no_overlap") ||
      candidate.message.includes("23P01"))
  );
}

/** Re-verifies an ACTIVE service in the session workspace (FR-011). */
async function resolveActiveService(
  serviceId: string,
  workspaceId: string
): Promise<{ id: string; durationMinutes: number }> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, workspaceId: true, status: true, durationMinutes: true },
  });

  if (!service || service.workspaceId !== workspaceId) {
    throw new WorkspaceAuthError(404, "Serviço não encontrado.");
  }
  if (service.status !== "ACTIVE") {
    throw new WorkspaceAuthError(409, "Este serviço está inativo.");
  }

  return { id: service.id, durationMinutes: service.durationMinutes };
}

export async function createAppointment(params: {
  workspaceId: string;
  callerMembershipId: string;
  callerRole: WorkspaceRole;
  actorId: string;
  data: CreateAppointmentInput;
}): Promise<{ appointment: AppointmentDTO }> {
  const { workspaceId, callerMembershipId, callerRole, actorId, data } = params;

  assertCanActOnProfessional({
    targetMembershipId: data.professionalId,
    callerMembershipId,
    callerRole,
  });

  const membership = await resolveMembershipInWorkspace(
    data.professionalId,
    workspaceId
  );
  if (membership.status !== "ACTIVE") {
    throw new WorkspaceAuthError(409, "Este profissional está inativo.");
  }

  const service = await resolveActiveService(data.serviceId, workspaceId);

  const startsAt = new Date(data.startsAt);
  const endsAt = computeEndsAt(startsAt, service.durationMinutes);

  if (isPastStart(startsAt, new Date())) {
    throw new WorkspaceAuthError(409, PAST_MESSAGE);
  }

  const businessHours = await getBusinessHours(workspaceId);
  if (!isWithinBusinessHours(startsAt, endsAt, businessHours)) {
    throw new WorkspaceAuthError(409, CLOSED_MESSAGE);
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          membershipId: data.professionalId,
          status: "SCHEDULED",
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new WorkspaceAuthError(409, CONFLICT_MESSAGE);
      }

      return tx.appointment.create({
        data: {
          workspaceId,
          membershipId: data.professionalId,
          serviceId: service.id,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          startsAt,
          endsAt,
          status: "SCHEDULED",
          createdById: actorId,
          events: {
            create: {
              type: "CREATED",
              newStartsAt: startsAt,
              newStatus: "SCHEDULED",
              actorId,
            },
          },
        },
        select: APPOINTMENT_SELECT,
      });
    });

    return { appointment: toAppointmentDTO(created) };
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new WorkspaceAuthError(409, CONFLICT_MESSAGE);
    }
    throw error;
  }
}

export async function rescheduleAppointment(params: {
  workspaceId: string;
  callerMembershipId: string;
  callerRole: WorkspaceRole;
  actorId: string;
  appointmentId: string;
  data: RescheduleAppointmentInput;
}): Promise<{ appointment: AppointmentDTO }> {
  const { workspaceId, callerMembershipId, callerRole, actorId, appointmentId, data } =
    params;

  const existing = await prisma.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
    select: {
      id: true,
      membershipId: true,
      status: true,
      startsAt: true,
      service: { select: { durationMinutes: true } },
    },
  });

  if (!existing) {
    throw new WorkspaceAuthError(404, "Agendamento não encontrado.");
  }

  assertCanActOnProfessional({
    targetMembershipId: existing.membershipId,
    callerMembershipId,
    callerRole,
  });

  if (existing.status !== "SCHEDULED") {
    throw new WorkspaceAuthError(
      409,
      "Apenas agendamentos ativos podem ser remarcados."
    );
  }

  // Determine the (possibly new) responsible professional.
  const nextMembershipId = data.professionalId ?? existing.membershipId;
  const professionalChanged = nextMembershipId !== existing.membershipId;

  if (professionalChanged) {
    // Moving to another professional is an OWNER/ADMIN-only action (FR-015).
    if (callerRole !== "OWNER" && callerRole !== "ADMIN") {
      throw new WorkspaceAuthError(
        403,
        "Você não tem permissão para mudar o profissional."
      );
    }
    const nextMembership = await resolveMembershipInWorkspace(
      nextMembershipId,
      workspaceId
    );
    if (nextMembership.status !== "ACTIVE") {
      throw new WorkspaceAuthError(409, "Este profissional está inativo.");
    }
  }

  const startsAt = new Date(data.startsAt);
  const endsAt = computeEndsAt(startsAt, existing.service.durationMinutes);

  if (isPastStart(startsAt, new Date())) {
    throw new WorkspaceAuthError(409, PAST_MESSAGE);
  }

  const businessHours = await getBusinessHours(workspaceId);
  if (!isWithinBusinessHours(startsAt, endsAt, businessHours)) {
    throw new WorkspaceAuthError(409, CLOSED_MESSAGE);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          id: { not: appointmentId },
          membershipId: nextMembershipId,
          status: "SCHEDULED",
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new WorkspaceAuthError(409, CONFLICT_MESSAGE);
      }

      const row = await tx.appointment.update({
        where: { id: appointmentId },
        data: { startsAt, endsAt, membershipId: nextMembershipId },
        select: APPOINTMENT_SELECT,
      });

      await tx.appointmentEvent.create({
        data: {
          appointmentId,
          type: "RESCHEDULED",
          previousStartsAt: existing.startsAt,
          newStartsAt: startsAt,
          previousMembershipId: professionalChanged
            ? existing.membershipId
            : null,
          newMembershipId: professionalChanged ? nextMembershipId : null,
          actorId,
        },
      });

      return row;
    });

    return { appointment: toAppointmentDTO(updated) };
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new WorkspaceAuthError(409, CONFLICT_MESSAGE);
    }
    throw error;
  }
}

export async function cancelAppointment(params: {
  workspaceId: string;
  callerMembershipId: string;
  callerRole: WorkspaceRole;
  actorId: string;
  appointmentId: string;
  reason?: string | null;
}): Promise<{ appointment: AppointmentDTO }> {
  const { workspaceId, callerMembershipId, callerRole, actorId, appointmentId } =
    params;
  const reason = params.reason ?? null;

  const existing = await prisma.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
    select: { id: true, membershipId: true, status: true },
  });

  if (!existing) {
    throw new WorkspaceAuthError(404, "Agendamento não encontrado.");
  }

  assertCanActOnProfessional({
    targetMembershipId: existing.membershipId,
    callerMembershipId,
    callerRole,
  });

  if (existing.status !== "SCHEDULED") {
    throw new WorkspaceAuthError(
      409,
      "Apenas agendamentos ativos podem ser cancelados."
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED", cancellationReason: reason },
      select: APPOINTMENT_SELECT,
    });

    await tx.appointmentEvent.create({
      data: {
        appointmentId,
        type: "CANCELLED",
        previousStatus: existing.status,
        newStatus: "CANCELLED",
        reason,
        actorId,
      },
    });

    return row;
  });

  return { appointment: toAppointmentDTO(updated) };
}

export async function setAppointmentStatus(params: {
  workspaceId: string;
  callerMembershipId: string;
  callerRole: WorkspaceRole;
  actorId: string;
  appointmentId: string;
  status: "COMPLETED" | "NO_SHOW";
}): Promise<{ appointment: AppointmentDTO }> {
  const { workspaceId, callerMembershipId, callerRole, actorId, appointmentId, status } =
    params;

  const existing = await prisma.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
    select: { id: true, membershipId: true, status: true },
  });

  if (!existing) {
    throw new WorkspaceAuthError(404, "Agendamento não encontrado.");
  }

  assertCanActOnProfessional({
    targetMembershipId: existing.membershipId,
    callerMembershipId,
    callerRole,
  });

  if (existing.status !== "SCHEDULED") {
    throw new WorkspaceAuthError(
      409,
      "Só é possível alterar o status de um agendamento ativo."
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status },
      select: APPOINTMENT_SELECT,
    });

    await tx.appointmentEvent.create({
      data: {
        appointmentId,
        type: "STATUS_CHANGED",
        previousStatus: existing.status,
        newStatus: status,
        actorId,
      },
    });

    return row;
  });

  return { appointment: toAppointmentDTO(updated) };
}
