import * as z from "zod";

/** ISO datetime string (workspace wall-clock instant, research §4). */
const isoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    error: "Informe uma data e hora válidas.",
  });

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data (AAAA-MM-DD)." });

const professionalIdSchema = z
  .string()
  .min(1, { error: "Selecione um profissional." });

const clientNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Informe o nome do cliente." });

const clientPhoneSchema = z
  .string()
  .trim()
  .min(1, { error: "Informe o telefone do cliente." });

/** `GET /api/workspace/appointments` query. */
export const ListAppointmentsSchema = z.object({
  professionalId: professionalIdSchema.optional(),
  date: dateKeySchema,
  includeCancelled: z.boolean().default(false),
});

export type ListAppointmentsInput = z.infer<typeof ListAppointmentsSchema>;

/** `POST /api/workspace/appointments` body. `endsAt` is derived server-side (FR-009). */
export const CreateAppointmentSchema = z.object({
  professionalId: professionalIdSchema,
  serviceId: z.string().min(1, { error: "Selecione um serviço." }),
  clientName: clientNameSchema,
  clientPhone: clientPhoneSchema,
  startsAt: isoDateTimeSchema,
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

/** `PATCH .../[id]` reschedule intent. */
export const RescheduleAppointmentSchema = z.object({
  startsAt: isoDateTimeSchema,
  professionalId: professionalIdSchema.optional(),
});

export type RescheduleAppointmentInput = z.infer<
  typeof RescheduleAppointmentSchema
>;

/** `PATCH .../[id]` status-change intent. */
export const SetAppointmentStatusSchema = z.object({
  status: z.enum(["COMPLETED", "NO_SHOW"], {
    error: "Status inválido.",
  }),
});

export type SetAppointmentStatusInput = z.infer<
  typeof SetAppointmentStatusSchema
>;

/** `DELETE .../[id]` (cancel) optional body. */
export const CancelAppointmentSchema = z.object({
  reason: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional(),
});

export type CancelAppointmentInput = z.infer<typeof CancelAppointmentSchema>;
