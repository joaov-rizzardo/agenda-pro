import * as z from "zod";

export const SERVICE_STATUSES = ["ACTIVE", "INACTIVE"] as const;

/** Money in reais: ≥ 0, at most 2 decimal places (research §1, FR-004/FR-016). */
const priceSchema = z
  .number({ error: "Informe um preço válido." })
  .min(0, { error: "O preço não pode ser negativo." })
  .refine((value) => Number(value.toFixed(2)) === value, {
    error: "O preço pode ter no máximo 2 casas decimais.",
  });

const durationSchema = z
  .int({ error: "Informe uma duração válida." })
  .positive({ error: "A duração deve ser maior que zero." });

const nameSchema = z
  .string()
  .trim()
  .min(1, { error: "Informe o nome do serviço." });

/** Optional free-text; blank collapses to `null` (FR-002). */
const descriptionSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

export const CreateServiceSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  durationMinutes: durationSchema,
  defaultPrice: priceSchema,
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

export const UpdateServiceSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema,
    durationMinutes: durationSchema.optional(),
    defaultPrice: priceSchema.optional(),
    status: z.enum(SERVICE_STATUSES).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.durationMinutes !== undefined ||
      data.defaultPrice !== undefined ||
      data.status !== undefined,
    { error: "Informe ao menos um campo para atualizar." }
  );

export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;

export const AssociateServiceSchema = z.object({
  serviceId: z.string().min(1, { error: "Selecione um serviço." }),
});

export type AssociateServiceInput = z.infer<typeof AssociateServiceSchema>;

export const SetCustomPriceSchema = z
  .object({
    useCustomPrice: z.boolean(),
    customPrice: priceSchema.optional(),
  })
  .refine(
    (data) => !data.useCustomPrice || data.customPrice !== undefined,
    { error: "Informe o preço personalizado.", path: ["customPrice"] }
  );

export type SetCustomPriceInput = z.infer<typeof SetCustomPriceSchema>;
