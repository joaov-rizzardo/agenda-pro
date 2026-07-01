import * as z from "zod";

const minuteOfDaySchema = z
  .int({ error: "Informe um horário válido." })
  .min(0, { error: "O horário deve estar entre 00:00 e 24:00." })
  .max(1440, { error: "O horário deve estar entre 00:00 e 24:00." });

const weekdaySchema = z
  .int({ error: "Dia da semana inválido." })
  .min(0, { error: "Dia da semana inválido." })
  .max(6, { error: "Dia da semana inválido." });

export const UpsertBusinessHoursSchema = z
  .object({
    openMinutes: minuteOfDaySchema,
    closeMinutes: minuteOfDaySchema,
    // A set of unique weekdays; empty means fechado todos os dias.
    openWeekdays: z
      .array(weekdaySchema)
      .refine((days) => new Set(days).size === days.length, {
        error: "Dias da semana repetidos.",
      }),
  })
  .refine((data) => data.closeMinutes > data.openMinutes, {
    error: "O horário de fechamento deve ser após a abertura.",
    path: ["closeMinutes"],
  });

export type UpsertBusinessHoursInput = z.infer<typeof UpsertBusinessHoursSchema>;
