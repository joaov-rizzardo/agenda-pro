"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { addDays, startOfToday } from "@/lib/agenda/time-grid";
import { Button } from "@/components/ui/button";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function AgendaToolbar({
  day,
  onChangeDay,
}: {
  day: Date;
  onChangeDay: (day: Date) => void;
}) {
  const label = DATE_FORMATTER.format(day);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChangeDay(addDays(day, -1))}
        aria-label="Dia anterior"
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChangeDay(addDays(day, 1))}
        aria-label="Próximo dia"
      >
        <ChevronRight />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onChangeDay(startOfToday())}>
        Hoje
      </Button>
      <span className="ml-1 truncate text-sm font-medium text-foreground first-letter:uppercase">
        {label}
      </span>
    </div>
  );
}
