"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { WorkspaceRole } from "@/generated/prisma/client";
import type { BusinessHoursDTO } from "@/lib/workspace/business-hours-service";
import {
  useBusinessHours,
  useUpdateBusinessHours,
} from "@/hooks/agenda/use-business-hours";
import { formatMinutes } from "@/lib/agenda/time-grid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 0 = domingo … 6 = sábado (research §4). */
const WEEKDAYS: { value: number; short: string; full: string }[] = [
  { value: 0, short: "dom", full: "Domingo" },
  { value: 1, short: "seg", full: "Segunda" },
  { value: 2, short: "ter", full: "Terça" },
  { value: 3, short: "qua", full: "Quarta" },
  { value: 4, short: "qui", full: "Quinta" },
  { value: 5, short: "sex", full: "Sexta" },
  { value: 6, short: "sáb", full: "Sábado" },
];

function timeToMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const minutes = Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  return minutes >= 0 && minutes <= 1440 ? minutes : null;
}

export function BusinessHoursSection({
  callerRole,
  initialBusinessHours,
}: {
  callerRole: WorkspaceRole;
  initialBusinessHours: BusinessHoursDTO;
}) {
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";
  const { data: businessHours = initialBusinessHours } = useBusinessHours(
    initialBusinessHours
  );
  const updateBusinessHours = useUpdateBusinessHours();

  const [openTime, setOpenTime] = useState(
    formatMinutes(businessHours.openMinutes)
  );
  const [closeTime, setCloseTime] = useState(
    formatMinutes(businessHours.closeMinutes)
  );
  const [openWeekdays, setOpenWeekdays] = useState<Set<number>>(
    new Set(businessHours.openWeekdays)
  );
  const [error, setError] = useState<string | null>(null);

  // Re-seed when the server value changes (e.g. after a save elsewhere).
  const [seededFrom, setSeededFrom] = useState(businessHours);
  if (seededFrom !== businessHours) {
    setSeededFrom(businessHours);
    setOpenTime(formatMinutes(businessHours.openMinutes));
    setCloseTime(formatMinutes(businessHours.closeMinutes));
    setOpenWeekdays(new Set(businessHours.openWeekdays));
    setError(null);
  }

  function toggleWeekday(value: number) {
    setOpenWeekdays((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const openMinutes = timeToMinutes(openTime);
    const closeMinutes = timeToMinutes(closeTime);
    if (openMinutes === null || closeMinutes === null) {
      setError("Informe horários válidos.");
      return;
    }
    if (closeMinutes <= openMinutes) {
      setError("O horário de fechamento deve ser após a abertura.");
      return;
    }

    setError(null);
    try {
      await updateBusinessHours.mutateAsync({
        openMinutes,
        closeMinutes,
        openWeekdays: [...openWeekdays],
      });
      toast.success("Horário de funcionamento salvo.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o horário."
      );
    }
  }

  return (
    <section className="glass-panel flex flex-col gap-6 rounded-xl p-5 md:p-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Horário de funcionamento
        </h2>
        <p className="text-sm text-muted-foreground">
          Define a faixa exibida na agenda e valida novos agendamentos e
          remarcações para todos os profissionais.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label
              htmlFor="business-hours-open"
              className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Abertura
            </Label>
            <Input
              id="business-hours-open"
              type="time"
              step={900}
              value={openTime}
              onChange={(event) => setOpenTime(event.target.value)}
              disabled={!canManage}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label
              htmlFor="business-hours-close"
              className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Fechamento
            </Label>
            <Input
              id="business-hours-close"
              type="time"
              step={900}
              value={closeTime}
              onChange={(event) => setCloseTime(event.target.value)}
              disabled={!canManage}
              aria-invalid={error ? true : undefined}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Dias abertos
          </span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const isOpen = openWeekdays.has(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  role="switch"
                  aria-checked={isOpen}
                  aria-label={day.full}
                  disabled={!canManage}
                  onClick={() => toggleWeekday(day.value)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                    isOpen
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
          {openWeekdays.size === 0 && (
            <p className="text-xs text-muted-foreground">
              Fechado todos os dias — nenhum agendamento poderá ser criado.
            </p>
          )}
        </div>

        {error && <p className="text-xs text-danger-fg">{error}</p>}

        {canManage && (
          <div className="flex justify-end">
            <Button type="submit" disabled={updateBusinessHours.isPending}>
              {updateBusinessHours.isPending ? "Salvando…" : "Salvar horário"}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}
