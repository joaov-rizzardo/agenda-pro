"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { WorkspaceRole } from "@/generated/prisma/client";
import type { MemberDTO } from "@/lib/workspace/member-service";
import type { AppointmentDTO } from "@/lib/workspace/appointment-service";
import type { ServiceDTO } from "@/lib/workspace/service-catalog-service";
import { useServices } from "@/hooks/services/use-services";
import {
  useCreateAppointment,
  useRescheduleAppointment,
} from "@/hooks/agenda/use-appointments";
import {
  dateKeyToDay,
  formatMinutes,
  minutesSinceMidnight,
  slotToDate,
  toDateKey,
} from "@/lib/agenda/time-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FieldErrors = {
  time?: string;
  serviceId?: string;
  clientName?: string;
  clientPhone?: string;
};

function buildStartsAtISO(dateKey: string, timeStr: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }
  const [hh, mm] = timeStr.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) {
    return null;
  }
  return slotToDate(dateKeyToDay(dateKey), hh * 60 + mm).toISOString();
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  professionalId,
  slotStartsAt,
  appointment = null,
  callerRole,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  slotStartsAt: Date | null;
  appointment?: AppointmentDTO | null;
  callerRole?: WorkspaceRole;
  members?: MemberDTO[];
}) {
  const isReschedule = appointment !== null;
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";
  const canEditProfessional = isReschedule && canManage && members !== undefined;

  const { data: services = [] } = useServices();
  const activeServices = services.filter(
    (service) => service.status === "ACTIVE"
  );
  const createAppointment = useCreateAppointment();
  const rescheduleAppointment = useRescheduleAppointment();
  const isPending =
    createAppointment.isPending || rescheduleAppointment.isPending;

  const [dateKey, setDateKey] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // Seed the form each time the dialog opens (adjust-state-during-render).
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setErrors({});
    if (appointment) {
      const start = new Date(appointment.startsAt);
      setDateKey(toDateKey(start));
      setTimeStr(formatMinutes(minutesSinceMidnight(start)));
      setServiceId(appointment.serviceId);
      setClientName(appointment.clientName);
      setClientPhone(appointment.clientPhone);
      setMembershipId(appointment.membershipId);
    } else {
      setDateKey(slotStartsAt ? toDateKey(slotStartsAt) : "");
      setTimeStr(
        slotStartsAt ? formatMinutes(minutesSinceMidnight(slotStartsAt)) : ""
      );
      setServiceId("");
      setClientName("");
      setClientPhone("");
      setMembershipId(professionalId);
    }
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const selectedService: ServiceDTO | undefined = activeServices.find(
    (service) => service.serviceId === serviceId
  );
  const durationMinutes = isReschedule
    ? appointment.durationMinutes
    : selectedService?.durationMinutes;

  const startMinutes = /^\d{2}:\d{2}$/.test(timeStr)
    ? Number(timeStr.slice(0, 2)) * 60 + Number(timeStr.slice(3, 5))
    : null;
  const endLabel =
    startMinutes !== null && durationMinutes !== undefined
      ? formatMinutes(startMinutes + durationMinutes)
      : null;

  const activeMembers = (members ?? []).filter(
    (member) => member.status === "ACTIVE"
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const startsAt = buildStartsAtISO(dateKey, timeStr);
    const nextErrors: FieldErrors = {};
    if (startsAt === null) {
      nextErrors.time = "Informe um horário válido.";
    }

    if (!isReschedule) {
      if (serviceId === "") {
        nextErrors.serviceId = "Selecione um serviço.";
      }
      if (clientName.trim() === "") {
        nextErrors.clientName = "Informe o nome do cliente.";
      }
      if (clientPhone.trim() === "") {
        nextErrors.clientPhone = "Informe o telefone do cliente.";
      }
    }

    if (Object.keys(nextErrors).length > 0 || startsAt === null) {
      setErrors(nextErrors);
      return;
    }

    try {
      if (isReschedule) {
        await rescheduleAppointment.mutateAsync({
          appointmentId: appointment.appointmentId,
          data: {
            startsAt,
            professionalId:
              canEditProfessional && membershipId !== appointment.membershipId
                ? membershipId
                : undefined,
          },
        });
        toast.success("Agendamento remarcado.");
      } else {
        await createAppointment.mutateAsync({
          professionalId,
          serviceId,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          startsAt,
        });
        toast.success("Agendamento criado.");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o agendamento."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isReschedule ? "Remarcar agendamento" : "Novo agendamento"}
          </DialogTitle>
          <DialogDescription>
            {isReschedule
              ? "Escolha o novo horário do agendamento."
              : "Preencha os dados para agendar."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="appointment-date">Data</Label>
              <Input
                id="appointment-date"
                type="date"
                value={dateKey}
                onChange={(event) => setDateKey(event.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="appointment-time">Horário</Label>
              <Input
                id="appointment-time"
                type="time"
                step={900}
                value={timeStr}
                onChange={(event) => setTimeStr(event.target.value)}
                aria-invalid={errors.time ? true : undefined}
              />
              {errors.time && (
                <p className="text-xs text-danger-fg">{errors.time}</p>
              )}
            </div>
          </div>

          {isReschedule ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                Serviço
              </span>
              <span className="text-sm text-foreground">
                {appointment.serviceName}
                {endLabel && (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    término às {endLabel}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointment-service">Serviço</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger
                  id="appointment-service"
                  className="w-full"
                  aria-invalid={errors.serviceId ? true : undefined}
                >
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {activeServices.map((service) => (
                    <SelectItem
                      key={service.serviceId}
                      value={service.serviceId}
                    >
                      {service.name} · {service.durationMinutes} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.serviceId && (
                <p className="text-xs text-danger-fg">{errors.serviceId}</p>
              )}
              {endLabel && (
                <p className="font-mono text-xs text-muted-foreground">
                  Término às {endLabel} ({durationMinutes} min)
                </p>
              )}
            </div>
          )}

          {canEditProfessional && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointment-professional">Profissional</Label>
              <Select value={membershipId} onValueChange={setMembershipId}>
                <SelectTrigger id="appointment-professional" className="w-full">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map((member) => (
                    <SelectItem
                      key={member.membershipId}
                      value={member.membershipId}
                    >
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isReschedule && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appointment-client-name">Nome do cliente</Label>
                <Input
                  id="appointment-client-name"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  autoComplete="off"
                  aria-invalid={errors.clientName ? true : undefined}
                />
                {errors.clientName && (
                  <p className="text-xs text-danger-fg">{errors.clientName}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appointment-client-phone">
                  Telefone do cliente
                </Label>
                <Input
                  id="appointment-client-phone"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  inputMode="tel"
                  autoComplete="off"
                  aria-invalid={errors.clientPhone ? true : undefined}
                />
                {errors.clientPhone && (
                  <p className="text-xs text-danger-fg">{errors.clientPhone}</p>
                )}
              </div>
            </>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Salvando…"
                : isReschedule
                  ? "Remarcar"
                  : "Criar agendamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
