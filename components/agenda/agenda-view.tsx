"use client";

import { useState } from "react";

import type { WorkspaceRole } from "@/generated/prisma/client";
import type { MemberDTO } from "@/lib/workspace/member-service";
import type {
  AppointmentDTO,
  ListAppointmentsResult,
} from "@/lib/workspace/appointment-service";
import { useAppointments } from "@/hooks/agenda/use-appointments";
import { dateKeyToDay, toDateKey } from "@/lib/agenda/time-grid";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AgendaToolbar } from "@/components/agenda/agenda-toolbar";
import { AgendaProfessionalSelect } from "@/components/agenda/agenda-professional-select";
import { AgendaTimeGrid } from "@/components/agenda/agenda-time-grid";
import { AppointmentDetailDialog } from "@/components/agenda/appointment-detail-dialog";
import { AppointmentFormDialog } from "@/components/agenda/appointment-form-dialog";

export function AgendaView({
  callerRole,
  callerMembershipId,
  initialAppointments,
  initialDate,
  initialMembers,
}: {
  callerRole: WorkspaceRole;
  callerMembershipId: string;
  initialAppointments: ListAppointmentsResult;
  initialDate: string;
  initialMembers?: MemberDTO[];
}) {
  const canSwitchProfessional =
    (callerRole === "OWNER" || callerRole === "ADMIN") &&
    initialMembers !== undefined;

  const [selectedDay, setSelectedDay] = useState(() => dateKeyToDay(initialDate));
  const [selectedProfessionalId, setSelectedProfessionalId] =
    useState(callerMembershipId);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [createSlot, setCreateSlot] = useState<Date | null>(null);
  const [formAppointment, setFormAppointment] = useState<AppointmentDTO | null>(
    null
  );
  const [formOpen, setFormOpen] = useState(false);

  const dateKey = toDateKey(selectedDay);
  // Omit the query param when viewing one's own agenda so the SSR initialData
  // (keyed as "self") is reused on first render.
  const professionalId =
    selectedProfessionalId === callerMembershipId
      ? undefined
      : selectedProfessionalId;
  const { data, isError } = useAppointments(
    { professionalId, date: dateKey, includeCancelled },
    professionalId === undefined && dateKey === initialDate && !includeCancelled
      ? initialAppointments
      : undefined
  );

  function openDetail(appointmentId: string) {
    setSelectedAppointmentId(appointmentId);
    setDetailOpen(true);
  }

  function openCreate(startsAt: Date) {
    setFormAppointment(null);
    setCreateSlot(startsAt);
    setFormOpen(true);
  }

  function openReschedule(appointment: AppointmentDTO) {
    setDetailOpen(false);
    setCreateSlot(null);
    setFormAppointment(appointment);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Agenda
        </span>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Agenda
        </h1>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AgendaToolbar day={selectedDay} onChangeDay={setSelectedDay} />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-cancelled"
              checked={includeCancelled}
              onCheckedChange={setIncludeCancelled}
            />
            <Label htmlFor="show-cancelled" className="text-sm text-muted-foreground">
              Mostrar cancelados
            </Label>
          </div>
          {canSwitchProfessional && (
            <AgendaProfessionalSelect
              value={selectedProfessionalId}
              onChange={setSelectedProfessionalId}
              initialMembers={initialMembers}
            />
          )}
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-danger-fg ring-1 ring-border">
          Não foi possível carregar a agenda. Tente novamente.
        </div>
      ) : !data ? (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
          Carregando agenda…
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.isOpen && data.appointments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum agendamento para este dia.
            </p>
          )}
          <AgendaTimeGrid
            day={selectedDay}
            businessHours={data.businessHours}
            isOpen={data.isOpen}
            appointments={data.appointments}
            onSelectAppointment={openDetail}
            onSelectSlot={openCreate}
          />
        </div>
      )}

      <AppointmentDetailDialog
        appointmentId={selectedAppointmentId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onReschedule={openReschedule}
        members={initialMembers}
      />

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        professionalId={selectedProfessionalId}
        slotStartsAt={createSlot}
        appointment={formAppointment}
        callerRole={callerRole}
        members={initialMembers}
      />
    </div>
  );
}
