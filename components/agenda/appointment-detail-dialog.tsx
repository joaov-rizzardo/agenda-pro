"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { AppointmentStatus } from "@/generated/prisma/client";
import type { MemberDTO } from "@/lib/workspace/member-service";
import type {
  AppointmentDTO,
  AppointmentEventDTO,
} from "@/lib/workspace/appointment-service";
import {
  useAppointmentDetail,
  useSetAppointmentStatus,
} from "@/hooks/agenda/use-appointments";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/workspace/labels";
import { formatMinutes, minutesSinceMidnight } from "@/lib/agenda/time-grid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentCancelDialog } from "@/components/agenda/appointment-cancel-dialog";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const EVENT_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const STATUS_DOT: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-primary",
  COMPLETED: "bg-success",
  CANCELLED: "bg-muted-foreground/50",
  NO_SHOW: "bg-warn",
};

/** Wall-clock HH:MM for an appointment instant (UTC-encoded, research §4). */
function clock(iso: string): string {
  return formatMinutes(minutesSinceMidnight(new Date(iso)));
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}

function describeEvent(
  event: AppointmentEventDTO,
  memberName: (membershipId: string | null) => string
): { title: string; detail: string | null } {
  switch (event.type) {
    case "CREATED":
      return { title: "Criado", detail: null };
    case "RESCHEDULED": {
      const parts: string[] = [];
      if (event.previousStartsAt && event.newStartsAt) {
        parts.push(`${clock(event.previousStartsAt)} → ${clock(event.newStartsAt)}`);
      }
      if (event.previousMembershipId || event.newMembershipId) {
        parts.push(
          `${memberName(event.previousMembershipId)} → ${memberName(event.newMembershipId)}`
        );
      }
      return { title: "Remarcado", detail: parts.join(" · ") || null };
    }
    case "CANCELLED":
      return { title: "Cancelado", detail: event.reason };
    case "STATUS_CHANGED":
      return {
        title: "Status alterado",
        detail: event.newStatus
          ? APPOINTMENT_STATUS_LABELS[event.newStatus]
          : null,
      };
    default:
      return { title: "Atualização", detail: null };
  }
}

export function AppointmentDetailDialog({
  appointmentId,
  open,
  onOpenChange,
  onReschedule,
  members,
}: {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule: (appointment: AppointmentDTO) => void;
  members?: MemberDTO[];
}) {
  const { data, isLoading } = useAppointmentDetail(open ? appointmentId : null);
  const setStatus = useSetAppointmentStatus();
  const [cancelOpen, setCancelOpen] = useState(false);
  const appointment = data?.appointment;
  const events = data?.events ?? [];

  function memberName(membershipId: string | null): string {
    if (!membershipId) {
      return "profissional";
    }
    const member = members?.find((m) => m.membershipId === membershipId);
    return member ? `${member.firstName} ${member.lastName}` : "profissional";
  }

  async function changeStatus(status: "COMPLETED" | "NO_SHOW") {
    if (!appointment) {
      return;
    }
    try {
      await setStatus.mutateAsync({
        appointmentId: appointment.appointmentId,
        status,
      });
      toast.success(
        status === "COMPLETED"
          ? "Agendamento concluído."
          : "Marcado como não compareceu."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status."
      );
    }
  }

  const isScheduled = appointment?.status === "SCHEDULED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Detalhes do agendamento
          </DialogTitle>
          <DialogDescription>
            Informações e histórico do agendamento.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !appointment ? (
          <p className="py-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn("size-2 rounded-full", STATUS_DOT[appointment.status])}
                aria-hidden
              />
              <span className="text-sm font-medium text-foreground">
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </span>
            </div>

            <DetailRow label="Cliente">
              <span className="font-medium">{appointment.clientName}</span>
              <span className="ml-2 text-muted-foreground">
                {appointment.clientPhone}
              </span>
            </DetailRow>

            <DetailRow label="Serviço">{appointment.serviceName}</DetailRow>

            <DetailRow label="Horário">
              {DATE_FORMATTER.format(new Date(appointment.startsAt))} ·{" "}
              <span className="font-mono">
                {clock(appointment.startsAt)} – {clock(appointment.endsAt)}
              </span>
            </DetailRow>

            <DetailRow label="Duração">
              {appointment.durationMinutes} min
            </DetailRow>

            {appointment.cancellationReason && (
              <DetailRow label="Motivo do cancelamento">
                {appointment.cancellationReason}
              </DetailRow>
            )}

            {events.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                  Histórico
                </span>
                <ul className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 ring-1 ring-border">
                  {events.map((event, index) => {
                    const { title, detail } = describeEvent(event, memberName);
                    return (
                      <li
                        key={`${event.type}-${index}`}
                        className="flex flex-col gap-0.5 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {title}
                          {detail && (
                            <span className="ml-1 font-normal text-muted-foreground">
                              {detail}
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {EVENT_TIME_FORMATTER.format(new Date(event.createdAt))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {isScheduled && appointment && (
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="outline"
              onClick={() => onReschedule(appointment)}
            >
              Remarcar
            </Button>
            <Button
              variant="outline"
              disabled={setStatus.isPending}
              onClick={() => changeStatus("COMPLETED")}
            >
              Marcar como concluído
            </Button>
            <Button
              variant="outline"
              disabled={setStatus.isPending}
              onClick={() => changeStatus("NO_SHOW")}
            >
              Marcar como não compareceu
            </Button>
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              Cancelar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>

      <AppointmentCancelDialog
        appointmentId={appointment?.appointmentId ?? null}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
    </Dialog>
  );
}
