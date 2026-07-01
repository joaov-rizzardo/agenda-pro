"use client";

import type { CSSProperties } from "react";

import type { AppointmentDTO } from "@/lib/workspace/appointment-service";
import type { BusinessHoursDTO } from "@/lib/workspace/business-hours-service";
import {
  SLOT_MINUTES,
  buildDaySlots,
  buildHourMarks,
  computeBlockPosition,
  formatMinutes,
  minutesSinceMidnight,
  slotToDate,
  startOfToday,
  toDateKey,
} from "@/lib/agenda/time-grid";
import { AgendaAppointmentBlock } from "@/components/agenda/agenda-appointment-block";

/** Fixed pixel height per 15-minute slot — the grid scrolls on small screens. */
const SLOT_PX = 32;
/** Floor height so very short appointments stay readable and clickable. */
const MIN_BLOCK_PX = 22;
/** Below this rendered height the block switches to a single-line layout. */
const COMPACT_BLOCK_PX = 44;

export function AgendaTimeGrid({
  day,
  businessHours,
  isOpen,
  appointments,
  onSelectAppointment,
  onSelectSlot,
}: {
  day: Date;
  businessHours: BusinessHoursDTO;
  isOpen: boolean;
  appointments: AppointmentDTO[];
  onSelectAppointment: (appointmentId: string) => void;
  onSelectSlot?: (startsAt: Date) => void;
}) {
  const { openMinutes, closeMinutes } = businessHours;
  const totalMinutes = Math.max(closeMinutes - openMinutes, 0);

  if (!isOpen) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
        O workspace está fechado neste dia.
      </div>
    );
  }

  const slots = buildDaySlots(openMinutes, closeMinutes);
  const hourMarks = buildHourMarks(openMinutes, closeMinutes);
  const surfaceHeight = totalMinutes * (SLOT_PX / SLOT_MINUTES);

  const isToday = toDateKey(day) === toDateKey(startOfToday());
  const nowMinutes = minutesSinceMidnight(new Date());
  const showNowLine =
    isToday && nowMinutes >= openMinutes && nowMinutes <= closeMinutes;

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      {/* Vertical padding keeps the first/last hour labels (which are
          centered on the open/close lines via -translate-y-1/2) from being
          clipped by the card's rounded overflow-hidden. */}
      <div className="flex py-6">
        {/* Hour rail */}
        <div
          className="relative w-14 shrink-0 border-r border-border"
          style={{ height: surfaceHeight }}
        >
          {hourMarks.map((mark) => (
            <span
              key={mark}
              className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground"
              style={{ top: `${((mark - openMinutes) / totalMinutes) * 100}%` }}
            >
              {formatMinutes(mark)}
            </span>
          ))}
        </div>

        {/* Slot surface */}
        <div
          className="relative flex-1"
          style={{
            height: surfaceHeight,
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${SLOT_PX - 1}px, var(--border) ${SLOT_PX - 1}px, var(--border) ${SLOT_PX}px)`,
          }}
        >
          {/* Empty-slot click targets (create) — behind the appointment blocks. */}
          {onSelectSlot &&
            slots.map((slotMinutes) => (
              <button
                key={slotMinutes}
                type="button"
                onClick={() => onSelectSlot(slotToDate(day, slotMinutes))}
                className="absolute inset-x-0 outline-none hover:bg-primary/5 focus-visible:bg-primary/5"
                style={{
                  top: `${((slotMinutes - openMinutes) / totalMinutes) * 100}%`,
                  height: `${(SLOT_MINUTES / totalMinutes) * 100}%`,
                }}
                aria-label={`Criar agendamento às ${formatMinutes(slotMinutes)}`}
              />
            ))}

          {showNowLine && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              style={{
                top: `${((nowMinutes - openMinutes) / totalMinutes) * 100}%`,
              }}
              aria-hidden
            >
              <span className="size-2 -translate-x-1/2 rounded-full bg-primary" />
              <span className="h-px flex-1 bg-primary" />
            </div>
          )}

          {appointments.map((appointment) => {
            const startsAt = new Date(appointment.startsAt);
            const endsAt = new Date(appointment.endsAt);
            const { top, height } = computeBlockPosition(
              startsAt,
              endsAt,
              openMinutes,
              closeMinutes
            );
            const durationMinutes =
              (endsAt.getTime() - startsAt.getTime()) / 60_000;
            const renderedPx = Math.max(
              (durationMinutes / SLOT_MINUTES) * SLOT_PX,
              MIN_BLOCK_PX
            );
            const style: CSSProperties = {
              top: `${top}%`,
              height: `${height}%`,
              minHeight: MIN_BLOCK_PX,
            };
            return (
              <AgendaAppointmentBlock
                key={appointment.appointmentId}
                appointment={appointment}
                style={style}
                compact={renderedPx < COMPACT_BLOCK_PX}
                onSelect={onSelectAppointment}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
