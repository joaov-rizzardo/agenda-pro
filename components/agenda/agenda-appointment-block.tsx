"use client";

import type { CSSProperties } from "react";

import type { AppointmentStatus } from "@/generated/prisma/client";
import type { AppointmentDTO } from "@/lib/workspace/appointment-service";
import { formatMinutes, minutesSinceMidnight } from "@/lib/agenda/time-grid";
import { cn } from "@/lib/utils";

/**
 * Status-driven tokens (research §5): a tinted surface + a left "spine" bar.
 * `surface` is painted as an opaque overlay over a solid `bg-card` base so the
 * block covers the grid lines behind it instead of letting them bleed through.
 */
const STATUS_STYLES: Record<
  AppointmentStatus,
  { surface: string; ring: string; text: string; spine: string; time: string }
> = {
  SCHEDULED: {
    surface: "bg-primary/10",
    ring: "ring-primary/25",
    text: "text-foreground",
    spine: "bg-primary",
    time: "text-primary",
  },
  COMPLETED: {
    surface: "bg-success-bg",
    ring: "ring-success/25",
    text: "text-success-fg",
    spine: "bg-success",
    time: "text-success-fg",
  },
  NO_SHOW: {
    surface: "bg-warn-bg",
    ring: "ring-warn/25",
    text: "text-warn-fg",
    spine: "bg-warn",
    time: "text-warn-fg",
  },
  CANCELLED: {
    surface: "bg-muted/60",
    ring: "ring-border",
    text: "text-muted-foreground line-through",
    spine: "bg-muted-foreground/40",
    time: "text-muted-foreground",
  },
};

function clockRange(startsAt: string, endsAt: string): string {
  const start = formatMinutes(minutesSinceMidnight(new Date(startsAt)));
  const end = formatMinutes(minutesSinceMidnight(new Date(endsAt)));
  return `${start} – ${end}`;
}

export function AgendaAppointmentBlock({
  appointment,
  style,
  compact = false,
  onSelect,
}: {
  appointment: AppointmentDTO;
  style: CSSProperties;
  /** Short appointments render as a single line (time + client, no service). */
  compact?: boolean;
  onSelect: (appointmentId: string) => void;
}) {
  const tokens = STATUS_STYLES[appointment.status];

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment.appointmentId)}
      style={style}
      className={cn(
        "group absolute right-1 left-1 isolate flex overflow-hidden rounded-lg bg-card text-left ring-1 transition-shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:shadow-sm",
        compact
          ? "flex-row items-center gap-1.5 px-2.5 py-0.5"
          : "flex-col gap-0.5 px-2.5 py-1.5",
        tokens.ring,
        tokens.text
      )}
    >
      {/* Opaque tint over the solid bg-card base — hides the grid lines. */}
      <span className={cn("absolute inset-0 -z-10", tokens.surface)} aria-hidden />
      <span
        className={cn("absolute inset-y-0 left-0 w-[3px] rounded-l-lg", tokens.spine)}
        aria-hidden
      />
      <span
        className={cn(
          "shrink-0 font-mono text-[11px] leading-none",
          tokens.time
        )}
      >
        {clockRange(appointment.startsAt, appointment.endsAt)}
      </span>
      <span className="truncate text-xs font-medium">
        {appointment.clientName}
      </span>
      {!compact && (
        <span className="truncate text-[11px] opacity-80">
          {appointment.serviceName}
        </span>
      )}
    </button>
  );
}
