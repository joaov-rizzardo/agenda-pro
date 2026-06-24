import * as z from "zod";

export const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, { error: "O nome do workspace é obrigatório." }),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});
