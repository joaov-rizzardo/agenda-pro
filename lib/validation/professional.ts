import * as z from "zod";

export const WORKSPACE_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export const MEMBERSHIP_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export const CreateInviteSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }).trim().toLowerCase(),
  name: z
    .string()
    .trim()
    .min(1, { error: "Informe um nome válido." })
    .optional(),
  role: z.enum(WORKSPACE_ROLES, { error: "Selecione um nível de acesso." }),
  jobTitle: z
    .string()
    .trim()
    .min(1, { error: "Informe um cargo válido." })
    .optional(),
});

export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;

export const UpdateMemberSchema = z
  .object({
    role: z.enum(WORKSPACE_ROLES).optional(),
    status: z.enum(MEMBERSHIP_STATUSES).optional(),
    jobTitle: z
      .string()
      .trim()
      .min(1, { error: "Informe um cargo válido." })
      .nullable()
      .optional(),
  })
  .refine(
    (data) =>
      data.role !== undefined ||
      data.status !== undefined ||
      data.jobTitle !== undefined,
    { error: "Informe ao menos um campo para atualizar." }
  );

export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png"] as const;
